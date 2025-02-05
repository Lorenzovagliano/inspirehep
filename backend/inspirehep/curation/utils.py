#
# Copyright (C) 2019 CERN.
#
# inspirehep is free software; you can redistribute it and/or modify it under
# the terms of the MIT License; see LICENSE file for more details.

import re

import structlog
from inspire_dojson.utils import get_recid_from_ref
from inspire_schemas.utils import normalize_collaboration_name
from inspire_utils.record import get_value
from invenio_db import db
from invenio_pidstore.errors import PIDDoesNotExistError
from invenio_search import current_search_client
from invenio_search.utils import prefix_index
from opensearch_dsl import MultiSearch, Q, Search

from inspirehep.curation.errors import SubGroupNotFound
from inspirehep.records.api import JournalsRecord
from inspirehep.search.api import InstitutionsSearch, LiteratureSearch

LOGGER = structlog.getLogger()


def get_journal_records_from_publication_info(record):
    journal_records_refs = get_value(record, "publication_info.journal_record")
    journal_records = []
    for ref in journal_records_refs:
        recid = get_recid_from_ref(ref)
        try:
            journal_records.append(JournalsRecord.get_record_by_pid_value(recid))
        except PIDDoesNotExistError:
            LOGGER.warning(
                "Journal referenced in literature record not found",
                literature_recid=record["control_number"],
                journal_recid=recid,
            )
    return journal_records


def set_refereed_and_fix_document_type(record):
    """Set the ``refereed`` field using the Journals DB.

    Searches in the Journals DB if the current article was published in journals
    that we know for sure to be peer-reviewed, or that publish both peer-reviewed
    and non peer-reviewed content but for which we can infer that it belongs to
    the former category, and sets the ``refereed`` key in ``data`` to ``True`` if
    that was the case. If instead we know for sure that all journals in which it
    published are **not** peer-reviewed we set it to ``False``.

    Also replaces the ``article`` document type with ``conference paper`` if the
    paper was only published in non refereed proceedings.

    Args:
        obj: a workflow object.
        eng: a workflow engine.

    Returns:
        None

    """
    journals = get_journal_records_from_publication_info(record)
    if not journals:
        LOGGER.info(
            "Journals not found for record", record_recid=record["control_number"]
        )
        return

    published_in_a_refereed_journal_without_proceedings = any(
        journal.get("refereed") and not journal.get("proceedings")
        for journal in journals
    )
    published_in_a_refereed_journal_with_proceedings = any(
        journal.get("refereed") and journal.get("proceedings") for journal in journals
    )
    not_a_conference_paper = "conference paper" not in record["document_type"]
    published_exclusively_in_non_refereed_journals = all(
        not journal.get("refereed", True) for journal in journals
    )

    published_only_in_proceedings = all(
        journal.get("proceedings") for journal in journals
    )
    published_only_in_non_refereed_journals = all(
        not journal.get("refereed") for journal in journals
    )

    if published_in_a_refereed_journal_without_proceedings or (
        not_a_conference_paper and published_in_a_refereed_journal_with_proceedings
    ):
        record["refereed"] = True
    elif published_exclusively_in_non_refereed_journals:
        record["refereed"] = False

    if published_only_in_proceedings and published_only_in_non_refereed_journals:
        try:
            record["document_type"].remove("article")
            record["document_type"].append("conference paper")
        except ValueError:
            LOGGER.warning(
                "Document type can not be updated",
                record_recid=record["control_number"],
            )
            pass
    record.update(dict(record))
    db.session.commit()


def collaboration_multi_search_query(collaborations):
    multi_search = MultiSearch(
        index=prefix_index("records-experiments"), using=current_search_client
    )
    for collaboration in collaborations:
        full_collaboration_string = collaboration.get("value", "")
        normalized_collaboration_string = normalize_collaboration_name(
            full_collaboration_string
        )
        if collaboration.get("record"):
            # Add dummy search so multisearch will stay in sync with collaborations
            multi_search = multi_search.add(Search().query().source(False))
            multi_search = multi_search.add(Search().query().source(False))
            continue
        name_search, subgroup_search = build_collaboration_search(
            normalized_collaboration_string
        )
        multi_search = multi_search.add(name_search)
        multi_search = multi_search.add(subgroup_search)

    return multi_search


def build_collaboration_search(normalized_collaboration_string):
    name_search = Q(
        "term", normalized_name_variants={"value": normalized_collaboration_string}
    )
    subgroup_search = Q(
        "term", normalized_subgroups={"value": normalized_collaboration_string}
    )
    source = ["collaboration", "self", "legacy_name", "control_number"]
    filters_ = Q("exists", field="collaboration")
    return (
        Search().query(name_search).filter(filters_).source(source),
        Search().query(subgroup_search).filter(filters_).source(source),
    )


def find_subgroup(subgroup, experiment):
    clean_special_characters = re.compile(r"[^\w\d_]", re.UNICODE)
    normalized_subgroup = normalize_collaboration_name(
        clean_special_characters.sub(" ", subgroup.lower())
    )
    subgroups = experiment.collaboration.subgroup_names
    normalized_subgroups = [
        normalize_collaboration_name(clean_special_characters.sub(" ", element.lower()))
        for element in subgroups
    ]
    for subgroup, normalized_subgroup_from_list in zip(
        subgroups, normalized_subgroups, strict=False
    ):
        if normalized_subgroup_from_list == normalized_subgroup:
            return subgroup
    raise SubGroupNotFound(experiment["control_number"], subgroup)


def find_collaboration_in_multisearch_response(
    collaboration_response, subgroup_response, collaboration, wf_id=None
):
    response = collaboration_response or subgroup_response
    if not response:
        LOGGER.info(
            "Collaboration normalization",
            workflow_id=wf_id,
            collaboration_value=collaboration["value"],
        )
        return
    collaboration_ambiguous_match = len(response.hits) > 1
    if collaboration_ambiguous_match:
        matched_collaboration_names = [
            matched_collaboration.collaboration.value
            for matched_collaboration in response
        ]
        LOGGER.info(
            "Ambiguous match for collaboration",
            workflow_id=wf_id,
            collaboration=collaboration["value"],
            matched_collaboration_names=matched_collaboration_names,
        )
        return
    matched_collaboration = (
        collaboration_response[0].collaboration.value
        if collaboration_response
        else find_subgroup(collaboration.get("value", ""), subgroup_response[0])
    )
    LOGGER.info(
        "Collaboration normalized",
        workflow_id=wf_id,
        collaboration_value=collaboration["value"],
        normalized_collaboration=matched_collaboration,
    )
    return matched_collaboration


def create_accelerator_experiment_from_collaboration_match(collaboration_match):
    accelerator_experiment = {"record": collaboration_match[0].self.to_dict()}
    if "legacy_name" in collaboration_match[0]:
        accelerator_experiment["legacy_name"] = collaboration_match[0].legacy_name

    return accelerator_experiment


def enhance_collaboration_data_with_collaboration_match(
    collaboration_match, collaboration, collaboration_normalized_name
):
    collaboration["value"] = collaboration_normalized_name
    collaboration["record"] = collaboration_match[0].self.to_dict()


def match_lit_author_affiliation(raw_aff):
    query = Q(
        "nested",
        path="authors",
        query=(
            Q("match", authors__raw_affiliations__value=raw_aff)
            & Q("exists", field="authors.affiliations.value")
        ),
        inner_hits={},
    )
    query_filters = Q("term", _collections="Literature") & Q("term", curated=True)
    result = (
        LiteratureSearch()
        .query(query)
        .filter(query_filters)
        .highlight("authors.raw_affiliations.value", fragment_size=len(raw_aff))
        .source(["control_number"])
        .params(size=20)
        .execute()
        .hits
    )
    return result


def clean_up_affiliation_data(affiliations):
    cleaned_affiliations = []
    for aff in affiliations:
        cleaned_affiliations.append(
            {key: val for key, val in aff.items() if key in ["value", "record"]}
        )
    return cleaned_affiliations


def find_unambiguous_affiliation(result, wf_id):
    for matched_author in result:
        matched_author_data = matched_author.meta.inner_hits.authors.hits[0].to_dict()
        matched_author_raw_affs = matched_author_data["raw_affiliations"]
        matched_author_affs = matched_author_data["affiliations"]
        matched_aff = []
        if len(matched_author_raw_affs) == 1:
            matched_aff = matched_author_affs
        elif len(matched_author_raw_affs) == len(matched_author_affs):
            matched_aff = extract_matched_aff_from_highlight(
                matched_author.meta.highlight["authors.raw_affiliations.value"],
                matched_author_raw_affs,
                matched_author_affs,
            )
        if matched_aff:
            message_payload = {"literature recid": matched_author["control_number"]}
            message = (
                "Found matching affiliation, literature recid:"
                f" {matched_author['control_number']}, raw_affiliations:"
                f" {matched_author_raw_affs}, matched affiliations: {matched_aff}"
            )
            if wf_id:
                message += f" workflow_id: {wf_id}"
            LOGGER.info("Found matching affiliation", message_payload)
            return clean_up_affiliation_data(matched_aff)


def raw_aff_highlight_len(highlighted_raw_aff):
    matches = re.findall(r"<em>(.*?)</em>", highlighted_raw_aff)
    return sum(len(match) for match in matches)


def extract_matched_aff_from_highlight(
    highlighted_raw_affs, author_raw_affs, author_affs
):
    raw_aff_highlight_lenghts = [
        raw_aff_highlight_len(raw_aff) for raw_aff in highlighted_raw_affs
    ]
    longest_highlight_idx = raw_aff_highlight_lenghts.index(
        max(raw_aff_highlight_lenghts)
    )
    extracted_raw_aff = re.sub(
        "<em>|</em>", "", highlighted_raw_affs[longest_highlight_idx]
    )
    for raw_aff, aff in zip(author_raw_affs, author_affs, strict=False):
        if raw_aff["value"] == extracted_raw_aff:
            return [aff]


def assign_institution(matched_affiliation):
    query = Q("match", legacy_ICN=matched_affiliation["value"])
    result = InstitutionsSearch().query(query).params(size=1).execute()
    if result:
        matched_affiliation["record"] = result.hits[0].to_dict()["self"]
        return matched_affiliation

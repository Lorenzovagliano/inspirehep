/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Map } from 'immutable';


import UrlsAction from '../../literature/components/UrlsAction';
import DOILinkAction from '../../literature/components/DOILinkAction';
import EditRecordAction from '../../common/components/EditRecordAction';
import ResultItem from '../../common/components/ResultItem';

import { DATA } from '../../common/routes';
import LiteratureTitle from '../../common/components/LiteratureTitle';
import AuthorsAndCollaborations from '../../common/components/AuthorsAndCollaborations';

function DataItem({
  metadata,
  page,
}) {
  const title = metadata.getIn(['titles', 0]);
  const authors = metadata.get('authors');
  const authorCount = authors && authors.size || 0;
  const dois = metadata.get('dois');
  const recordId = metadata.get('control_number');
  const urls = metadata.get('urls');
  const canEdit = metadata.get('can_edit', false);

  return (
    <div data-test-id="data-result-item">
      <ResultItem
        leftActions={
          <>
            {urls && (
              <UrlsAction
                urls={urls}
                text="links"
                trackerEventId="Literature file"
                page={page}
              />
            )}
            {dois && <DOILinkAction dois={dois} page={page} />}

            {canEdit && (
              <EditRecordAction pidType="data" pidValue={recordId} page={page} />
            )}

          </>
        }
      >
        <div data-test-id="data-result-item-inner">
          <div className="flex flex-nowrap">
            <div className="flex-grow-1">
              <Link
                data-test-id="data-result-title-link"
                className="result-item-title"
                to={`${DATA}/${recordId}`}
              >
                <LiteratureTitle title={title} />
              </Link>
            </div>

          </div>
          <div className="mt1">
            <AuthorsAndCollaborations
              authorCount={authorCount}
              authors={authors}
            />
          </div>
        </div>

      </ResultItem>
    </div>
  );
}

DataItem.propTypes = {
  metadata: PropTypes.instanceOf(Map).isRequired,
  isCatalogerLoggedIn: PropTypes.bool,
};

export default DataItem;

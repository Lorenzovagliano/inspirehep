import React from 'react';
import { EditOutlined } from '@ant-design/icons';

import UserAction from './UserAction';
import IconText from './IconText';
import EventTracker from './EventTracker';
import LinkWithTargetBlank from './LinkWithTargetBlank';

import {
  EDIT_LITERATURE,
  EDIT_JOB,
  EDIT_CONFERENCE,
  EDIT_AUTHOR,
  EDIT_AUTHOR_CATALOGER,
  EDIT_INSTITUTION,
  EDIT_SEMINAR,
  EDIT_JOURNAL,
  EDIT_EXPERIMENT,
  EDIT_DATA,
} from '../routes';
import { PidValue, PidType } from '../../types';

const pidTypeToEditRoutePrefix = {
  literature: EDIT_LITERATURE,
  jobs: EDIT_JOB,
  conferences: EDIT_CONFERENCE,
  authors: EDIT_AUTHOR,
  institutions: EDIT_INSTITUTION,
  seminars: EDIT_SEMINAR,
  journals: EDIT_JOURNAL,
  experiments: EDIT_EXPERIMENT,
  data: EDIT_DATA,
};

interface EditRecordActionProps {
  pidType: PidType;
  pidValue: PidValue;
  page: string;
  isCatalogerLoggedIn?: boolean;
}

export default function EditRecordAction({
  pidType,
  pidValue,
  isCatalogerLoggedIn,
  page,
}: EditRecordActionProps) {
  const pidTypeRoute =
    pidType === 'authors' && isCatalogerLoggedIn
      ? EDIT_AUTHOR_CATALOGER
      : pidTypeToEditRoutePrefix[pidType];

  return (
    <UserAction>
      <EventTracker
        eventCategory={page}
        eventAction="Edit"
        eventId={`Edit ${pidType} record`}
      >
        <LinkWithTargetBlank href={`${pidTypeRoute}/${pidValue}`}>
          <IconText text="edit" icon={<EditOutlined />} />
        </LinkWithTargetBlank>
      </EventTracker>
    </UserAction>
  );
}

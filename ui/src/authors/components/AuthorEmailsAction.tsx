import React from 'react';
import { List, Map } from 'immutable';
import { MailOutlined } from '@ant-design/icons';
import { Menu, Tooltip } from 'antd';

import LinkWithTargetBlank from '../../common/components/LinkWithTargetBlank';
import ActionsDropdownOrAction from '../../common/components/ActionsDropdownOrAction';

function getHrefForEmail(email: Map<string, string>) {
  return `mailto:${email.get('value')}`;
}

function renderEmailsDropdownAction(email: Map<string, string>) {
  return (
    <Menu.Item key={email.get('value')}>
      <LinkWithTargetBlank href={getHrefForEmail(email)}>
        {email.get('value')}
      </LinkWithTargetBlank>
    </Menu.Item>
  );
}

function renderEmailAction(email: Map<string, string>, title: string) {
  return <LinkWithTargetBlank href={getHrefForEmail(email)}>{title}</LinkWithTargetBlank>;
}

const ACTION_TITLE = (
  <Tooltip title="Contact author">
    <MailOutlined />
  </Tooltip>
);

function AuthorEmailsAction({ emails }: { emails: List<string> }) {
  return (
    <ActionsDropdownOrAction
      values={emails}
      renderAction={renderEmailAction}
      renderDropdownAction={renderEmailsDropdownAction}
      title={ACTION_TITLE}
    />
  );
}

export default AuthorEmailsAction;
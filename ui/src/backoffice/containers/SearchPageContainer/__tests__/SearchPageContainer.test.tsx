import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';
import { fromJS } from 'immutable';

import { getStoreWithState } from '../../../../fixtures/store';
import SearchPageContainer from '../SearchPageContainer';
import { BACKOFFICE_SEARCH } from '../../../../common/routes';
import { BACKOFFICE_SEARCH_REQUEST } from '../../../../actions/actionTypes';

describe('SearchPageContainer', () => {
  let store = getStoreWithState({
    backoffice: fromJS({
      loading: false,
      loggedIn: true,
      query: {},
      totalResults: 15,
    }),
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (store: any) =>
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[BACKOFFICE_SEARCH]}>
          <SearchPageContainer />
        </MemoryRouter>
      </Provider>
    );

  it('renders the SearchPage component', () => {
    const { getByTestId, asFragment } = renderComponent(store);

    const searchPage = getByTestId('backoffice-search-page');

    expect(searchPage).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  it('should dispatch fetchSearchResults on mount', () => {
    store.clearActions();
    renderComponent(store);

    expect(store.getActions()[0]).toEqual({
      type: BACKOFFICE_SEARCH_REQUEST,
    });
  });

  it('should dispatch fetchSearchResults when query changes', () => {
    store.clearActions();

    store = getStoreWithState({
      backoffice: fromJS({
        query: { page: 2, size: 10 },
      }),
    });
    renderComponent(store);

    expect(store.getActions()[0]).toEqual({
      type: BACKOFFICE_SEARCH_REQUEST,
    });
  });
});
import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { Row, Col } from 'antd';
import { connect } from 'react-redux';

import PaginationContainer from '../../common/containers/PaginationContainer';
import ResultsContainer from '../../common/containers/ResultsContainer';
import NumberOfResultsContainer from '../../common/containers/NumberOfResultsContainer';
import LoadingOrChildren from '../../common/components/LoadingOrChildren';
import DocumentHead from '../../common/components/DocumentHead';
import { SEARCH_PAGE_GUTTER } from '../../common/constants';
import ExperimentItem from '../components/ExperimentItem';
import { EXPERIMENTS_NS } from '../../search/constants';
import AggregationFiltersContainer from '../../common/containers/AggregationFiltersContainer';
import ResponsiveView from '../../common/components/ResponsiveView';
import DrawerHandle from '../../common/components/DrawerHandle';
import { APIButton } from '../../common/components/APIButton';
import { isSuperUser } from '../../common/authorization';

const META_DESCRIPTION = 'Find experiments in High Energy Physics';
const TITLE = 'Experiments Search';

function renderExperimentItem(result) {
  return <ExperimentItem metadata={result.get('metadata')} />;
}

function ExperimentSearchPage({
  loading,
  loadingAggregations,
  isSuperUserLoggedIn,
}) {
  const renderAggregations = useCallback(
    () => (
      <LoadingOrChildren loading={loadingAggregations}>
        <AggregationFiltersContainer
          namespace={EXPERIMENTS_NS}
          page="Experiments search"
        />
      </LoadingOrChildren>
    ),
    [loadingAggregations]
  );

  return (
    <>
      <DocumentHead title={TITLE} description={META_DESCRIPTION} />
      <Row data-testid="experiments-search-page-container">
        <Col xs={24} lg={22} xl={20} xxl={18}>
          <Row className="mt3" gutter={SEARCH_PAGE_GUTTER} justify="start">
            <Col xs={0} lg={7}>
              <ResponsiveView min="lg" render={renderAggregations} />
            </Col>
            <Col xs={24} lg={17}>
              <LoadingOrChildren loading={loading}>
                <Row>
                  <Col xs={24} lg={12}>
                    <NumberOfResultsContainer namespace={EXPERIMENTS_NS} />
                    {isSuperUserLoggedIn && (
                      <APIButton url={window.location.href} />
                    )}
                  </Col>
                  <Col xs={12} lg={0}>
                    <ResponsiveView
                      max="md"
                      render={() => (
                        <DrawerHandle handleText="Filter" drawerTitle="Filter">
                          {renderAggregations()}
                        </DrawerHandle>
                      )}
                    />
                  </Col>
                </Row>
                <Row>
                  <Col span={24}>
                    <ResultsContainer
                      namespace={EXPERIMENTS_NS}
                      renderItem={renderExperimentItem}
                    />
                    <PaginationContainer namespace={EXPERIMENTS_NS} />
                  </Col>
                </Row>
              </LoadingOrChildren>
            </Col>
          </Row>
        </Col>
      </Row>
    </>
  );
}

ExperimentSearchPage.propTypes = {
  loading: PropTypes.bool.isRequired,
  loadingAggregations: PropTypes.bool.isRequired,
};

const stateToProps = (state) => ({
  isSuperUserLoggedIn: isSuperUser(state.user.getIn(['data', 'roles'])),
  loading: state.search.getIn(['namespaces', EXPERIMENTS_NS, 'loading']),
  loadingAggregations: state.search.getIn([
    'namespaces',
    EXPERIMENTS_NS,
    'loadingAggregations',
  ]),
});

export default connect(stateToProps)(ExperimentSearchPage);

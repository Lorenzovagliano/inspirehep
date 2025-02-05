import { configure } from 'enzyme';
import { configure as configureTestingLibrary } from '@testing-library/react';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { createSerializer } from 'enzyme-to-json';
import 'jest-localstorage-mock';
import 'jest-enzyme';
import '@testing-library/jest-dom';

configure({ adapter: new Adapter() });

configureTestingLibrary({ asyncUtilTimeout: 3000 }); // Set timeout for waitFor to 3000ms (3 seconds)

expect.addSnapshotSerializer(createSerializer({ mode: 'deep' }));

/* eslint-disable */
// mock so that `react-quill` works with `mount`
// https://github.com/zenoamaro/react-quill/issues/434
global.MutationObserver = class {
  constructor(callback) {}
  disconnect() {}
  observe(element, initObject) {}
  takeRecords() {
    return [];
  }
};
global.document.getSelection = function () {};
global.CONFIG = {};
global.scrollTo = () => {};

jest.mock('rc-notification/lib/Notification');

// fix react-media
window.matchMedia = (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(), // deprecated
  removeListener: jest.fn(), // deprecated
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
});

global.window.location = {
  origin: 'http://localhost:3000',
  host: 'localhost:3000',
  protocol: 'http:',
  port: '3000',
  hostname: 'localhost',
};

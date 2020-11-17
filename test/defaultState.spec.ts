import createSlice from '../src/index';
import { expect } from 'chai';

const slice = createSlice('slice',
  () => ({
    prop1: ' ',
    prop2: 123
  }),
  () => ({}),
)

const { reducer } = slice;

describe('default state', () => {
  it('reducer should return ', () => {
    const state  = reducer.slice();
    console.log(state);
  });

});

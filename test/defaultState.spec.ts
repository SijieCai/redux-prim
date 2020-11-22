import createSlice from '../src/redux-prim';
import { expect } from 'chai';

const slice = createSlice('slice',
  () => ({
    prop1: '',
    prop2: 123
  }),
  () => ({}),
)

const { reducer } = slice;

describe('default state', () => {
  it('reducer should return the default state shape', () => {
    const state = reducer.slice();
    expect(state).to.deep.equal({
      prop1: '', prop2: 123
    })
  });

  it('should accept and merge the params state obj', () => {
    const state = { someProp: 'value' };
    const newState = reducer.slice(state);
    expect(newState).to.equal(state);
  })
});

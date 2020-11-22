import createSlice from '../src/redux-prim';
import { expect } from 'chai';

const slice = createSlice('slice',
  () => ({
    prop1: ' ',
    prop2: 123
  }),
  ({ setState }) => ({
    action1() {
      return setState({});
    },
    action2() {
      return setState({});
    }
  }),
)

describe('createSlice general test', () => {
  it('createSlice should return reducer type', () => {
    expect(slice.reducer.slice).to.be.a('function');
    expect(slice.reducer).to.have.all.keys('slice');
  });

  it('createSlice should return actions', () => {
    expect(slice.actions).to.have.all.keys('action1', 'action2');
    expect(slice.actions.action1).to.be.a('function');
    expect(slice.actions.action2).to.be.a('function');
  });

  it('createSlice should return selector', ()=>{
    expect(slice.selector).to.be.a('function');
  })
});

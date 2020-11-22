import createSlice from '../src/index';
import { expect } from 'chai';

const slice = createSlice('slice',
  () => ({
    prop1: '',
    prop2: 123
  }),
  ({ setState, mergeState, initState }) => ({
    setStateAction(obj) {
      return setState(obj);
    },
    mergeStateAction(obj) {
      return mergeState(obj);
    },
    initStateAction(obj) {
      return initState(obj);
    }
  }),
)

const { actions, reducer } = slice;
describe('updater function should mutate state', () => {
  it('setState with defaultState', () => {
    let action = actions.setStateAction({ prop3: 'new value' });
    const state = reducer.slice(undefined, action);
    expect(state).to.deep.equal({
      prop1: '',
      prop2: 123,
      prop3: 'new value'
    })
  });

  it('setState with specified state', () => {
    let action = actions.setStateAction({ prop3: 'new value' });
    const state = reducer.slice({}, action);
    expect(state).to.deep.equal({ prop3: 'new value' });
  });


  it('setState the funtional way', () => {
    let action = actions.setStateAction((state: { [name: string]: any }) => {
      return { ...state, prop4: 'new value4' };
    });
    const state = reducer.slice({ prop: 'some value' }, action);
    expect(state).to.deep.equal({ prop4: 'new value4', prop: 'some value' });
  });

  it('mergeState the normal way', () => {
    let action = actions.mergeStateAction({ prop: { a: 1, b: 2 } });

    const state = reducer.slice({ prop: { c: 3 } }, action);
    expect(state).to.deep.equal({ prop: { a: 1, b: 2, c: 3 } });
  });


  it('mergeState the override way 1', () => {
    let action = actions.mergeStateAction({ prop: { a: 1, b: 2 } });

    const state = reducer.slice({ prop: 1 }, action);
    expect(state).to.deep.equal({ prop: { a: 1, b: 2 } });
  });

  it('mergeState the override way 1', () => {
    let action = actions.mergeStateAction({ prop: 1 });

    const state = reducer.slice({ prop: { value: 'value' } }, action);
    expect(state).to.deep.equal({ prop: 1 });
  });

  it('initState should return correct action 1', () => {
    let action = actions.initStateAction({ prop1: 'prop1' });
    const state = reducer.slice({ prop: 'prop' }, action);
    expect(state).to.deep.equal({
      prop2: 123,
      prop1: 'prop1'
    });
  });
  it('initState should return correct action 2', () => {
    let action = actions.initStateAction({ prop: 'old' });
    const state = reducer.slice({ prop: 'new' }, action);
    expect(state).to.deep.equal({
      prop1: '',
      prop2: 123,
      prop: 'old',
    });
  });
});

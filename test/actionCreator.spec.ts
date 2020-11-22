import createSlice from '../src/index';
import { expect } from 'chai';

const slice = createSlice('slice',
  () => ({
    prop1: ' ',
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

const { actions } = slice;

describe('action creator function should return correct action', () => {
  it('setState should return correct action', () => {
    let action = actions.setStateAction({ prop1: 'new value' });
    expect(action).to.have.all.keys('type', 'payload', 'meta');
    expect(action.type).to.equal('@prim/slice/setState/?prop1=[String]');
    expect(action.payload).deep.equal({ prop1: 'new value' });
    expect(action.meta).to.have.all.keys('isPrimAction', 'namespace', 'updaterName');
    expect(action.meta).deep.equal({
      isPrimAction: true,
      namespace: 'slice',
      updaterName: 'setState'
    });
  });

  it('mergeState should return correct action', ()=>{
    let action = actions.mergeStateAction({ prop1: 'new value' });
    expect(action).to.have.all.keys('type', 'payload', 'meta');
    expect(action.type).to.equal('@prim/slice/mergeState/?prop1=[String]');
    expect(action.payload).deep.equal({ prop1: 'new value' });
    expect(action.meta).to.have.all.keys('isPrimAction', 'namespace', 'updaterName');
    expect(action.meta).deep.equal({
      isPrimAction: true,
      namespace: 'slice',
      updaterName: 'mergeState'
    });
  });

  it('initState should return correct action', ()=>{
    let action = actions.initStateAction({ prop1: 'new value' });
    expect(action).to.have.all.keys('type', 'payload', 'meta');
    expect(action.type).to.equal('@prim/slice/initState/?prop1=[String]');
    expect(action.payload).deep.equal({ prop1: 'new value' });
    expect(action.meta).to.have.all.keys('isPrimAction', 'namespace', 'updaterName');
    expect(action.meta).deep.equal({
      isPrimAction: true,
      namespace: 'slice',
      updaterName: 'initState'
    });
  })
});

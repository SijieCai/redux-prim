import createSlice from '../src/redux-prim';
import { expect } from 'chai';

const slice = createSlice('slice',
  () => ({}),
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

function testUnexpectedType(typeInstance: any) {
  const type = Object.prototype.toString.call(typeInstance)
  expect(() => {
    actions.setStateAction(typeInstance);
  }).to.throw(`Unexpected setState payload type ${type}`);

  expect(() => {
    actions.mergeStateAction(typeInstance);
  }).to.throw(`Unexpected mergeState payload type ${type}`);

  expect(() => {
    actions.initStateAction(typeInstance);
  }).to.throw(`Unexpected initState payload type ${type}`);
}
describe('action name generate', () => {
  it('should throw error when type is number, boolean, null or array.', () => {
    testUnexpectedType(123);
    testUnexpectedType(true);
    testUnexpectedType(false);
    testUnexpectedType(null);
    testUnexpectedType([]);
  });

  it('initState, mergeState should throw error when type is function.', () => {
    const fn = new Function;
    expect(() => {
      actions.mergeStateAction(fn);
    }).to.throw(`Unexpected mergeState payload type [object Function]`);

    expect(() => {
      actions.initStateAction(fn);
    }).to.throw(`Unexpected initState payload type [object Function]`);

    expect(() => {
      actions.setStateAction(fn);
    }).to.not.throw();
  });
  



  it('when type is an object', () => {
    let action = slice.actions.setStateAction({ a: 1, b: 'b', c: [], d: {}, e: true, f: null, g: undefined });
    expect(action.type).to.equal('@prim/slice/setState/?a=1&b=[String]&c=[Array]&d=[Object]&e=true&f=null&g=undefined');
  });
  it('when type is an empty object', () => {
    let action = slice.actions.setStateAction({});
    expect(action.type).to.equal('@prim/slice/setState/?');
  });
});

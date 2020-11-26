function getType(x: any): string {
  return Object.prototype.toString.call(x).replace('object ', '');
}
type Dictionary = { [key: string]: any }
type PrimMeta<T> = { isPrimAction: boolean, namespace: string, updaterName: keyof PrimUpdaterImpls<T> };
type PrimAction<T> = { type: string, payload: any, meta?: PrimMeta<T>, error?: any }

interface UpdateParam<T extends Dictionary> {
  state: T,
  getDefaultState: Function,
  action: PrimAction<T>
}
interface PrimUpdaterImpls<T extends Dictionary> {
  initState: (p: UpdateParam<T>) => Dictionary,
  setState: (p: UpdateParam<T>) => Dictionary,
  mergeState: (p: UpdateParam<T>) => Dictionary
}
interface PrimUpdaters<T extends Dictionary> {
  initState: (p?: Dictionary) => PrimAction<T>,
  setState: (p: Dictionary | ((s: Readonly<T>) => Dictionary)) => PrimAction<T>,
  mergeState: (p: Dictionary) => PrimAction<T>
}
const _actionTypePrefix = '@prim'

function stringify(x: any) {
  const type = getType(x);
  if (['[Null]', '[Undefined]', '[Number]', '[Boolean]'].indexOf(type) >= 0) {
    return x;
  }
  return type
}

function querify(payload: Dictionary = {}) {
  return Object.keys(payload)
    .map(key => `${key}=${stringify(payload[key])}`)
    .join('&')
}

function updaterActionCreators<T>(namespace: string): PrimUpdaters<T> {
  function getMeta(updaterName: keyof PrimUpdaterImpls<T>): PrimMeta<T> {
    return {
      isPrimAction: true,
      namespace,
      updaterName
    }
  }
  const ns = namespace

  function createAction(payloadNotValid: boolean, updaterName: keyof PrimUpdaterImpls<T>, payload?: Dictionary): PrimAction<T> {
    if (payloadNotValid) {
      throw new Error(`Unexpected ${updaterName} payload type ${Object.prototype.toString.call(payload)}`)
    }
    return {
      type: `${_actionTypePrefix}/${ns}/${updaterName}/?${querify(payload)}`,
      payload,
      meta: getMeta(updaterName)
    }
  }
 

  return {
    initState: (payload?: Dictionary): PrimAction<T> => {
      const payloadNotValid = payload !== undefined && getType(payload) !== '[Object]';
      return createAction(payloadNotValid, 'initState', payload);
    },
    setState: (payload: Dictionary | ((state: T) => Dictionary)): PrimAction<T> => {
      const type = getType(payload);
      const payloadNotValid = type !== '[Object]' && type !== '[Function]';
      return createAction(payloadNotValid, 'setState', payload);
    },
    mergeState: (payload: Dictionary) => {
      const payloadNotValid = getType(payload) !== '[Object]';
      return createAction(payloadNotValid, 'mergeState', payload);
    }
  }
}


function isMatchedAction<T>(namespace: string, action?: PrimAction<T>) {
  const meta = action?.meta;
  return meta?.isPrimAction && meta?.namespace === namespace;
}


type ThunkCallback<T> = (dispatch: ((action: PrimAction<T>) => void), getState: () => Dictionary) => void;
export default function createSlice<T extends { [key: string]: (...args: any) => PrimAction<P> | ThunkCallback<P> }, P extends Dictionary>(
  namespace: string,
  getDefaultState: () => P,
  creator: (updaters: PrimUpdaters<P>) => T
) {
  const actions = creator(updaterActionCreators<P>(namespace));

  const reducer = {
    [namespace]: (state: Dictionary = getDefaultState(), action?: PrimAction<P>): any => {
      if (!isMatchedAction(namespace, action)) return state

      const { updaterName } = action?.meta as PrimMeta<P>;

      const _updaters: PrimUpdaterImpls<P> = {
        initState({ action, getDefaultState }) {
          return Object.assign({}, getDefaultState(), action.payload);
        },
        setState({ state, action }) {
          if (typeof action.payload === 'function') {
            let reducer = action.payload as ((s: P) => Dictionary);
            return reducer(state);
          }
          return Object.assign({}, state, action.payload);
        },
        mergeState({ state, action }) {
          const payload = action.payload
          return Object.keys(payload).reduce(function (s: Dictionary, key: string) {
            if (getType(s[key]) === '[Object]' && getType(payload[key]) === '[Object]') {
              s[key] = Object.assign({}, s[key], payload[key])
            } else {
              s[key] = payload[key]
            }
            return s
          }, Object.assign({}, state))
        }
      }
      if (updaterName) {
        return _updaters[updaterName]({
          state: state as P,
          action: action as PrimAction<P>,
          getDefaultState
        })
      }
    }
  };

  return { actions, reducer, selector: (state: Dictionary): P => state[namespace] };
}

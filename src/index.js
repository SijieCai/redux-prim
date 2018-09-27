function getType(x) {
  return Object.prototype.toString.call(x).replace('object ', '');
}
const _updaters = {
  initState({ action, getDefaultState }) {
    return Object.assign({}, getDefaultState(), action.payload)
  },
  setState({ state, action }) {
    return Object.assign({}, state, action.payload)
  },
  mergeState({ state, action }) {
    const payload = action.payload
    return Object.keys(payload).reduce(function(s, key) {
      if (getType(s[key]) === '[Object]' && getType(payload[key]) === '[Object]') {
        s[key] = Object.assign({}, s[key], payload[key])
      } else {
        s[key] = payload[key]
      }
      return s
    }, Object.assign({}, state))
  }
}

var _actionTypePrefix = ''

export var extendUpdaters = function(namedUpdaters) {
  Object.assign(_updaters, namedUpdaters)
}

function stringify(x) {
  var type = getType(x);
  if (['[Number]', '[Boolean]', '[Undefined]'].indexOf(type) > 0) {
    return x
  }
  return type
}

function querify(payload, intend) {
  if (intend) {
    return intend
  }
  var payloadStr = stringify(payload)
  if (payloadStr === '[Object]') {
    return Object.keys(payload)
      .map(key => `${key}=${stringify(payload[key])}`)
      .join('&')
  }

  return payloadStr
}

function updaterActionCreators(namespace, signer) {
  function getMeta(updaterName) {
    var m = {
      isPrimAction: true,
      namespace,
      signer
    }
    if (updaterName) {
      m.updaterName = updaterName
    }
    return m
  }
  var ns = namespace
  if (signer) {
    ns = `${namespace}/${signer}`
  }
  function updaterActionCreator(name) {
    return function(payload, intend) {
      return {
        type: `${_actionTypePrefix}/${ns}/${name}/?${querify(payload, intend)}`,
        payload,
        meta: getMeta(name)
      }
    }
  }

  return {
    ...Object.keys(_updaters).reduce(function(ret, updaterName) {
      ret[updaterName] = updaterActionCreator(updaterName)
      return ret
    }, {}),
    primAction(action) {
      return {
        type: `${_actionTypePrefix}/${ns}/${action.type}`,
        payload: action,
        meta: getMeta()
      }
    }
  }
}

export function createContractActions(namespace, creator) {
  if (typeof creator !== 'function') {
    throw new Error('Expected the creator to be a function.')
  }
  return function(signer, ...args) {
    if (
      typeof signer !== 'string' &&
      typeof signer !== 'number' &&
      typeof signer !== 'symbol'
    ) {
      throw new Error('Expected the signer to be a string , number or symbol.')
    }
    return Object.assign({}, creator(updaterActionCreators(namespace, signer), ...args), {signer})
  }
}

export function createPrimActions(namespace, creator) {
  if (typeof creator !== 'function') {
    throw new Error('Expected the creator to be a function.')
  }
  return creator(updaterActionCreators(namespace))
}

function isMatchedAction(action, namespace) {
  var meta = action.meta
  if (!meta || Object.prototype.toString(meta) !== '[object Object]') {
    return false
  }
  return meta.isPrimAction && meta.namespace === namespace
}

export function createContractReducer(namespace, getDefaultState, reducer) {
  return function(state = getDefaultState(), action) {
    if (!isMatchedAction(action, namespace)) return state

    var { updaterName, signer } = action.meta

    if (updaterName) {
      if (
        state['@signer'] &&
        updaterName !== 'initState' &&
        state['@signer'] !== signer
      ) {
        return state
      }
      if (updaterName === 'initState') {
        action.payload = Object.assign({ '@signer': signer }, action.payload)
      }
      return _updaters[updaterName]({
        state,
        action,
        getDefaultState
      })
    }

    if (!reducer) {
      throw new Error(
        `reducer function is not defined in createContractReducer("${namespace}", getDefaultState, reducer)`
      )
    }
    return reducer(state, action.payload, getDefaultState)
  }
}

export function createPrimReducer(namespace, getDefaultState, reducer) {
  return function(state = getDefaultState(), action) {
    if (!isMatchedAction(action, namespace)) return state

    var { updaterName } = action.meta

    if (updaterName) {
      return _updaters[updaterName]({
        state,
        action,
        getDefaultState
      })
    }
    if (!reducer) {
      throw new Error(
        `reducer function is not defined in createPrimReducer("${namespace}", getDefaultState, reducer)`
      )
    }
    return reducer(state, action.payload, getDefaultState)
  }
}

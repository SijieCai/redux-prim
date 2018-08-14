var _extendReducers = {
  initState({ action, getDefaultState }) {
    return Object.assign({}, getDefaultState(), action.payload, { '@@uid': action.uid });
  },
  setState({ state, action }) {
    return Object.assign({}, state, action.payload);
  },
  mergeState({ state, action }) {
    return Object.keys(action.payload).reduce(function (s, key) {
      if (typeof s[key] === 'object' && typeof action.payload[key] === 'object') {
        s[key] = Object.assign({}, s[key], action.payload[key]);
      } else {
        s[key] = action.payload;
      }
      return s;
    }, Object.assign({}, state));
  },
  primAction({ state, action, reducer }) {
    return reducer(state, action);
  }
}

export var extendReducers = function (namedReducers) {
  Object.assign(_extendReducers, namedReducers);
}

function stringify(x) {
  var type = Object.prototype.toString.call(x).replace('object ', '');
  if (['[Number]', '[Boolean]', '[Undefined]'].indexOf(type) > 0) {
    return x;
  }
  return type;
}

function querify(payload) {
  var payloadStr = stringify(payload);
  if (payloadStr === '[Object]') {
    return Object.keys(payload).map(key => `${key}=${stringify(payload[key])}`).join('&');
  }

  return payloadStr;
}

export var createContractActions = function (baseName, actionsCreator) {
  if (typeof actionsCreator !== 'function') {
    throw new Error('Expected the actionsCreator to be a function.');
  }
  return function (uid, options) {
    if (typeof uid !== 'string' && typeof uid !== 'number') {
      throw new Error('Expected the uid to be a string or number.');
    }
    function createPrimAction(name) {
      return function (payload) {
        return {
          type: `@prim/${baseName}/${uid}/${name}?${querify(payload)}`,
          payload
        }
      }
    }

    var primActions = Object.keys(_extendReducers).reduce(function (actions, key) {
      actions[key] = createPrimAction(key);
      return actions;
    }, {})
    primActions.primAction = function ({ type, payload, ...rest }) {
      return {
        type: `@prim/${baseName}/${uid}/${type}`,
        payload,
        ...rest
      }
    }
    return actionsCreator(primActions, options);
  }
}

function toPrimAction(baseName, action) {
  var regexp = new RegExp(`^@prim/${baseName}/(.*)/([^?]+)[?]?(.*)$`);
  var match = regexp.exec(action.type);
  if (match) {
    return {
      uid: match[1],
      type: match[2],
      payload: action.payload,
      meta: action
    }
  }
  return null;
}

export var createContractReducer = function (baseName, getDefaultState, reducer) {
  return function (state = getDefaultState(), action) {

    var primAction = toPrimAction(baseName, action);

    if (primAction) {
      if (state['@@uid'] && primAction.type !== 'initState' && state['@@uid'] !== primAction.uid) {
        return state;
      }
      var matchedReducer = _extendReducers[primAction.type];
      var param = { state, action: primAction, getDefaultState, reducer };
      if (matchedReducer) {
        return matchedReducer(param);
      }
      return _extendReducers.primAction(param)
    }
    return reducer(state, action);
  }
}

[![APMLicense](https://img.shields.io/apm/l/vim-mode.svg)](https://github.com/SijieCai/redux-prim)
[![Build Status](https://travis-ci.org/SijieCai/redux-prim.svg?branch=master)](https://travis-ci.org/SijieCai/redux-prim)
[![codecov](https://codecov.io/gh/SijieCai/ts-class-validator/branch/master/graph/badge.svg)](https://codecov.io/gh/SijieCai/redux-prim)


# redux-prim

redux-prim builds an abstract layer on top of redux, making state management as it should be:
- The initial state: `getDefaultState`
- State modification: `updaters` and `namespacing`

The actions and reducers are greatly weaken, while under the abstraction layer, everything stays the same:

- State is a single immutable object tree.
- *Actions* describe updates.
- *Reducer* pure function to apply updates.
- Redux's ecosystem

This abstraction is more in line with the human brain's understanding of the data, and supports custom *updater* to achieve code reuse. Redux-prim also provides interfaces for **data contract design**.

## Install

```shell
npm i redux-prim
```

## Simple example

Create a todo slice
``` javascript
import createSlice from 'redux-prim';

const {actions, reducer, selector} = createSlice('todo',
()=>({ visible: false }),
({ setState }) => {
  return {
    setTodoVisibility(todoVisible) {
      return setState({ todoVisible });
    }
  }
});

```

combine reducers
``` javascript
import { combineReducers } from 'redux';
import todoSlice from './todoSlice';

export default combineReducers({
  ...todoSlice.reducer
});
```

use slice
``` javascript
import React, { useCallback } from 'react'; 
import todoSlice from './store/todoSlice';
import { useSelector, useDispatch } from 'react-redux';
const { actions, selector } = todoSlice;

function App() {
  const todo = useSelector(selector);
  const dispatch = useDispatch();
  const showTodo = useCallback(() => dispatch(actions.setTodoVisibility(true)), []); 
  return (
    <div>
      {todo.visible ? <div>this is todo</div> : <button onClick={showTodo}>show todo</button>}
    </div>
  )
}
```

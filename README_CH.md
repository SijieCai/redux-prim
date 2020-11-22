# redux-prim
redux-prim 是一个 redux 的辅助开发工具，其完全遵循 redux 架构的约定：

- state 是不可变的单一对象树。
- 用 action 描述意图。
- 用纯函数 reducer 实现 state 的修改。

在此基础上，通过引入命名空间，并把 action 和 reducer 抽象为

- 数据初始值（getDefaultState）
- 数据的修改（updaters纯函数）

这种抽象更符合人脑对数据的理解，并且支持自定义 updater 实现代码复用。在这个抽象层之下，redux-prim 会按照 redux 的方式来实现，我们仍然可以使用 redux 生态里的工具链。

redux-prim@2 版本去除了一些复杂的设计理念，更加聚焦在减少模式代码本身，并更好的支持 TypeScript。完整例子参考
[redux-prim example]](https://github.com/sijiecai/redux-prim-example).


## 安装

```shell
npm i redux-prim 

```

## 简单例子

创建一个 todo slice
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

Reducers
``` javascript
import { combineReducers } from 'redux';
import { userReducer } from './userSlice';
import { appReducer } from './appSlice';

export default combineReducers({
  ...userReducer,
  ...appReducer
});
```

使用slice
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

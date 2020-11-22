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

## Namespace
例子中 `createPrimActions` 和 `createPrimReducer` 的第一个参数必填参数 **todo** 是命名空间，同一命名空间的 actions 和 reducers 是配套的，它是 redux-prim 实现其它特性的基础。

## Updater
Updater 是 redux-prim 最重要的特性，它表示对数据操作的一层抽象，这些函数与业务无关，方便我们快速在这个抽象基础上实现业务逻辑。比如上述例子的 `setState` 就是一个内置的 `updater`，你会发现它生成一个符合 `FSA` 的 `action`，并由对应的 `reducer` 函数处理。

``` javascript
{
    type: '@prim/todo/setState?todoVisible=true'
    payload: { todoVisible: true }
}
```
这个 action 会被对应的内置 reducer 捕获并处理，redux-prim 内置三个 updaters：

- initState(state), 对应 reducer 实现：
``` javascript
    return Object.assign({}, getDefaultState(), state);
```

- setState(changes), 对应 reducer 实现：
``` javascript
    return Object.assign({}, state, changes);
```

- mergeState(changes), 对应 reducer 实现
``` javascript
return Object.keys(changes).reduce(function (s, key) {
  if (Object.prototype.toString.call(s[key]) === "[object Object]" &&
    Object.prototype.toString.call(changes[key]) === "[object Object]") {
    s[key] = Object.assign({}, s[key], changes[key]);
  } else {
    s[key] = changes[key];
  }
  return s;
}, Object.assign({}, state));
```

## extendUpdaters 
我们非常谨慎的提供 Updater 及其实现，并允许自定义 `updater` 甚至覆盖默认实现，下面代码实现名为`pushArray`的 updater:

``` javascript
import { extendUpdaters } = from 'reduxe-prim';
extendUpdaters({
  pushArray({ state, action, /*getDefaultState*/ }) {
    var { name, value } = action.payload // for simplicity
    return {...state, [name]: [...state[name], value] }
  }
})
```
使用 `pushArray`：

``` javascript
import { createPrimActions, createPrimReducer } from 'redux-prim';
var todoActions = createPrimActions('todo', ({ pushArray }) => {
    return {
        addTodo(todo) {
            return pushArray({ name: 'todoList', value: todo });
        }
    }
} );
combineReducer({
    todo: createPrimReducer('todo', function getDefaultState() {
        return {
      todoList: []
    }
    })
})
```

打印 pushArray 返回的 action 可以看到：
``` javascript
{
    type: '@prim/todo/pushArray?name=[String]&value=[Object]',
    payload: { name: 'todoList', value: todo }
}
```
刚才提到，Updater 本身是数据操作的抽象，我们甚至可以覆盖内置 `updater` 并基于 Immutable.js 重写。
``` javascript
import { extendUpdaters } = from 'reduxe-prim';
extendUpdaters({
  setState({ state, action }) { /* use immutable.js */ },
  mergeState({ state, action }) { /* use immutable.js */ }
  //...
})
```

## action 和 reducer
有些和业务相关的复杂数据操作，不适合用 `extendUpdaters` 实现。 我们仍然可以使用 redux 的方式实现，参考如下写法：

``` javascript
import { createPrimActions, createPrimReducer } from 'redux-prim';

var todoActions = createPrimActions('todo', ({ primAction /*, setState*/ }) => {
  return {
    complexAction(data) {
      // 用 primAction 包裹，才能在下面的 reducer 里面捕获
      return primAction({
        type: 'complex-action',
        payload: data
      })
    }
  }
} );

combineReducer({
  todo: createPrimReducer('todo', getDefaultState, function reducer(state, action) {
    if(action.type === 'complex-action') {
      // return a new state
    }
    return state;
  })
})
```
可以发现 action 签名如下
``` javascript
{
    type: '@prim/todo/complex-action',
    payload: data
}
```

## redux 生态
redux-prim 本质还是 redux 架构，action 的创建按照 `FSA` 规范保证兼容大部分中间件。假如我们配置了 redux-thunk 中间件，可以正常在 `createPrimAction` 里面使用：
``` javascript
var todoActions = createPrimActions('todo', ({ initState }) => ({
  loadPage(todo) {
    return async (dispatch, getState) => {
      var pageState = await loadPageState();
      dispatch(initState(pageState));
    }
  }
}));
```

# 设计初衷
redux-prim 并不是为了解决 redux boilerplate 的问题而设计。起初在一个 react + redux 架构大型项目下，我们实现了大量相似页面的场景抽象和代码复用，经过大量的实践和演变，我把这套最佳实践总结为 **数据契约式设计**，redux-prim 就是其演化过程的产物。

## 数据契约设计
最开始我觉得这种设计包含数据驱动，以及一种契约的理念，后来我发现 Bertrond Myer 在 OOP 也提出了契约式设计并获得广泛认可。让我惊喜的是最终两者惊人的契合，尤其体现在设计原则上。数据契约设计可以认为是在 FP 下实现抽象设计的方法。

## 何时使用
在云平台系统、CMS、ERP 等，我们会遇到大量相似的场景，比如表格页或者表单页，这些页面设计风格和体验基本一致。需要把这些页面的抽象并复用代码实现，同时遵循 react +  redux 的模式。


## 解决了什么问题
redux 是一个通过 action 和 reducer 管理 state 的类库，它规定 state 是不可变的单一对象树，state 的修改必须通过 dispatch 一个 action 来声明意图，并通过纯函数 reducer 返回新的 state 来达到修改的目的。这样可以让应用更可预测，同时更好支持热重载，时间旅行和服务端渲染等功能。但是带来的问题也很明显：

- **过多的模式代码**

在一个拥有几十上百个列表增删改查页的应用中，假设一个页面需要10+ actions，1个reducer 以及若干的容器组件，我们需要实现维护数千个甚至更多的 actions 和 actionCreator，数百个 reducer，以及更多的容器组件（容器组件通常会细分以获得更高的性能）。使用 redux-prim 这样的页面不管多少，只需要与一个页面差不多甚至更少的 actions，reducer 和容器组件就能完成。大大增加的开发速度和维护成本。

## 代码实现步骤
一个比较典型的页面如下（截图自 antd-pro）：
![](http://p406.qhimgs4.com/t01958b0e04e22a2fb1.png)
页面比如用户，订单，地址等大致类似,我们暂定这种场景叫 page。要实现一个 page 数据契约，首先：

### 抽象 state 的共性
在系统中我们有许多类似的页面，比如 todo， user，admin，order 等。一般在redux 我们会把页面的数据划分到不同的域（data domains）。比如：
``` JavaScript
  const app = combineReducers({
     todo: todoReducer,
   user: userReducer,
   admin: adminReducer,
   order: orderReducer
  })
```
这种方式会导致功能一致的 container 组件在不同页面的重复定义，因为 connect 的数据域不一致。所以我们制定一个契约（契约强调如果不实现责任，就获取没有利益），所有类似的页面使用同一个数据域 page，并且同一时间这个数据域只有一个场景在使用：

### createContractReducer

``` JavaScript
  import { createContractReducer } from 'reduc-prim';
  const app = combineReducers({
    page:  createContractReducer('page', getDefaultState)
  })
```
我们继续制定契约，约定每个页面都有
  - list：数组，根据不同页面，可以是任意的对象。
  - criteria：一个代表 `key` `value` 的搜索条件，不同页面可以随意设置这个对象
  - pagination：分页, 包含 `page`, `pageSize` 和 `total`。


``` JavaScript
function getDefaultState() {
  return  {
    // an array of domain object
    list: [], 
    // key value pairs use to do build api query
    criteria: {},
    pagination: { page, pageSize, total }
  }
}
```
因为有了契约，每个功能对应的数据的名称，结构以及所在数据域都被固定下来，代码抽象变得更加容易和彻底。

由于 action 和 reducer 已经被 redux-prim 弱化，我们接下来抽象契约数据的行为，对应的是 action creator：
 
### createContractActions

``` JavaScript
import { createContractActions } from 'redux-prim';
const pageContractActions =
  createContractActions('page', ({ primAction, initState, setState, mergeState }, { getListApi }) => {
    var actions = {
      initState(state) {
      // 页面组件在 componentDidMount 必须调用 initState，除了提供各自
      // 的初始状态，更重要是给 page 数据域施加一个排它锁。
        return initState(state);
      }
      setCriteria(criteria) {
        return mergeState({ criteria })
      },
      resetCriteria() {
        return setState({ criteria: {} });
      },
      getList() {
        return (dispatch, getState) => {
          const { criteria, pagination } = getState().page;
          return getListApi(criteria, pagination).then(data => {
            dispatch(setState({data}));
          });
        }
      },
      changePagination(page, pageSize) {
        return dispatch => {
          dispatch(setState({ page, pageSize }));
          dispatch(actions.getList());
        }
      }
    };
    return actions;
  }
```
因为每一个页面获取列表数据的接口都不一样，所以 pageContractActions 是一个高阶函数，它接受两个参数，name 和 options。
``` javascript
// todo actions
var todoActions = pageContractActions ('todo', { getListApi: api.getTodoList });

// orderActions
var orderActions = pageContractActions ('order', { getListApi: api.getOrderList });

``` 

这里面我们对 getListApi 制定了契约，规定其函数签名为：
``` javascript
  function getListApi(
    criteria: Object, 
    pagination: {page: number, pageSize: number}
  ): Promise<{
    list: Array,
    page: number,
    pageSize: number
  }>
```
`问题：如果我们项目的后端接口不一致怎么办：
  可以用高阶函数做适配，否则就不要接入这套实现。
`
### 实现通用容器组件
现在我们可以针对契约数据 `list` 实现一个通用的表格组件：
``` JavaScript
connect(
  state=>({list: state.page.list})
)
class PageTable extends React.Component {
  static propsType = {
    howToRender: PropTypes.any.isRequired
  }
}
```
这个容器组件只是知道怎么获取数据，但是对数据怎么显示一无所知，所以需要在场景页面配置如何显示：
``` JavaScript
// User 页面
import PageTable from './PageTable';
import UserActions from './UserActions';
connect(
  ()=>({}) // 只是为了 dispach
)
class User extends Component {
  componentDidMount() {
    this.dispatch(UserActions.initState());
  }
  renderColumns = [
    {
      renderHeader = () => '名字',
      renderContent = item => item.name
    }, {
      renderHeader = () => '性别',
      renderContent = item => <Gender value={item.gender}/>
    }
  ]
  render() {
    return <PageTable howToRender={this.renderColumns}/>
  }
}
```

## 其它方案和异同
关于 redux 架构代码复用，社区里面有大量的分享和总结，最容易获取的是官方（其实就是 @Dan Abramov） 提出的 [reusing reducer logic](https://redux.js.org/recipes/structuringreducers/reusingreducerlogic)，这里面强调复用 reducer。然而 reducer 是一个纯函数，无法处理 side effect 比如异步的问题，大部分逻辑被转移到 action creator，导致复用 reducer 效果非常有限。

于是社区在此理论基础上提出增强 reducer 功能的方案比如 [redux-loop](https://github.com/redux-loop/redux-loop)，[redux-observable](https://redux-observable.js.org/)。redux-loop 有很多新的概念，redux-observable 背后是 rxjs 以及响应式编程。这种方案理论上我认为是可行的，沿着@Dan Abramov 大神指引的方向一路走，就是略有引虎拒狼的味道，学习曲线陡增，并引入了更多的 `boilerplate`。redux-prim 作者最开始还不是 Dan Abramov 的粉丝（知道他是 react-dnd 和 redux 之父后也转粉那是后来的事了），我并不认为 reducer 是抽象的唯一元素，而是把需要抽象的重复场景所有相关的模块（action，reducer，container等）通过契约的方式内聚起来，更多在设计上解决问题，而不是框架上（redux-prim 只有不到200 行代码的实现）。

能基本消除 boilerplate 是让我真正愿意开源和推广 redux-prim 的原因，毕竟代码抽象很难复制传授，基本只能嫡传（跟着一起干项目才能领会），而且系统很容易就毁在一个小小的错误设计上。 在实现上，我也是后知后觉的发现社区里2016年就实现的 [redux-updeep](https://github.com/algolia/redux-updeep) 最接近 redux-prim，它使用了 updeep 这个库1️以不可变的方式合并任意的 payload，相当于在 redux-prim 基于 updeep 实现一个 updater，action 仍然需要自己约束实现。相比之下 redux-prim 有更良好的理论支撑，数据操作是一种抽象，updater 怎么实现按照各自的喜好，action 和 reducer 概念变得透明。


## 最后
契约的概念的特点强调了设计是一种权衡，比如：设计者应该牺牲哪些通用性，来获取哪些利益。

通常在大型项目中破坏抽象的元凶就是无节制的添加功能或者说防御式兼容。而数据契约设计进场让开发者重新审视这些变动，并尝试在别的层面解决问题。结果是降低了系统的耦合性，同时保护了抽象和已经复用的代码。这一点我在几个项目的实践中体会深刻。

同样的场景如果不用 redux，不用数据契约设计，是否也能达到类似的抽象效果？答案是肯定的，其实我就是用 OOP 的方式实现之后，探索如何在 FP 这一种范式里面达到类似的效果。要说最终的区别就是，OOP 的方式更加好理解，而 FP 的方式提供了更多的可预测性和组合性。这目前只是我的一种感觉，或许可以用数学来证明？

这里我们列出 Bertrand Meyer 在 OOP 契约式设计几个原则和数据契约设计对比，会发现有惊人相似：

-  Command–query separation (CQS)
  对比 redux 的 action 和 reducer。 

-  Uniform access principle (UAP) 
  里面提出派生数据的概念
  
-  Single Choice Principle (SCP)
  单一数据源，dry
  
-  Open/Closed Principle (OCP)
  开发封闭原则

虽然类似，但是编程范式都不一样，因为抽象从数据开始，所以我命名为`数据契约设计`，这是为了沟通的方便，如果被更多人认可，慢慢就会被接受和提出。
 
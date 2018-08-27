# redux-prim

Redux-prim is a secondary development tool for redux that fully follows the conventions of the redux architecture:

- The state is an immutable object tree within a single store.
- Describe intentions with *actions*.
- Modify the state with the pure function *reducer*.

In addition, abstract *action* and *reducer* by introducing a namespace as:

- Initial value of data（getDefaultState）
- Data modification（updaters pure function）

This abstraction is more in line with the human brain's understanding of the data, and supports custom *updater* to achieve code reuse. Under the abstraction layer, redux-prim is implemented as redux, so we can still use the toolchain in the redux ecosystem.

Redux-prim also provides interfaces for **data contract design**.

## Install

```shell
npm i redux-prim
```

## Simple example

```javascript
import { createPrimActions, createPrimReducer } from 'redux-prim';

var todoActions = createPrimActions('todo', ({ setState }) => {
  return {
    setTodoVisibility(todoVisible) {
      return setState({ todoVisible });
    }
  }
} );

combineReducer({
  todo: createPrimReducer('todo', function getDefaultState() {
    return { todoVisible: false };
  })
})

```

No middleware configuration is required, no action and reducer need to be defined.

## Namespace

In the example, the first parameter **todo** of `createPrimActions` and `createPrimReducer` is required, it's a namespace. The actions and reducers of the same namespace are matched. It is the basis for redux-prim to implement other features.

## Updater

Updater is the most important feature of redux-prim. These functions are not related to the business, but represent an abstraction of the data operations, so that we can quickly implement business logic on this abstraction. For example, the `setState` of the above example is a built-in `updater`, and you will find that it generates a `action` that conforms to `SFA` and is processed by the corresponding `reducer` function.

```javascript
{
    type: '@prim/todo/setState?todoVisible=true'
    payload: { todoVisible: true }
}
```

This action is captured and processed by the corresponding built-in reducer, and redux-prim has three built-in updaters:

- initState(state), corresponding to the reducer implementation:

```javascript
    return Object.assign({}, getDefaultState(), state);
```

- setState(changes), corresponding to the reducer implementation:

```javascript
    return Object.assign({}, state, changes);
```

- mergeState(changes), corresponding to the reducer implementation:

```javascript
return Object.keys(changes).reduce(function (s, key) {
  if (Object.prototype.toString.call(s[key]) === "[object Object]" &&
    Object.prototype.toString.call(changes[key]) === "[object Object]") {
    s[key] = Object.assign({}, s[key], changes[key]);
  } else {
    s[key] = changes;
  }
  return s;
}, Object.assign({}, state));
```

## extendUpdaters

We are very cautious about providing Updater and its implementation, and allowing custom `updater` to override the default implementation. The following code implements an updater named `pushArray`:

```javascript
import { extendUpdaters } = from 'reduxe-prim';
extendUpdaters({
  pushArray({ state, action, /*getDefaultState*/ }) {
    var { name, value } = action.payload // for simplicity
    return {...state, [name]: [...state[name], value] }
  }
})
```

Use `pushArray`：

```javascript
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

Print the action returned by pushArray :

```javascript
{
    type: '@prim/todo/pushArray?name=[String]&value=[Object]',
    payload: { name: 'todoList', value: todo }
}
```

As mentioned earlier, the Updater itself is an abstraction of data manipulation. We can even override the built-in `updater` and rewrite it based on Immutable.js.

```javascript
import { extendUpdaters } = from 'reduxe-prim';
extendUpdaters({
  setState({ state, action }) { /* use immutable.js */ },
  mergeState({ state, action }) { /* use immutable.js */ }
  //...
})
```

## action and reducer

Some complex data operations related to the business are not suitable for implementation with `extendUpdaters`. We can still do this using redux, refer to the following:

```javascript
import { createPrimActions, createPrimReducer } from 'redux-prim';

var todoActions = createPrimActions('todo', ({ primAction /*, setState*/ }) => {
  return {
    complexAction(data) {
      // wrapped with primAction to capture in the reducer below
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

You can find the action signature as follows :

```javascript
{
    type: '@prim/todo/complex-action',
    payload: data
}
```

## Redux ecology

Redux-prim is essentially a redux architecture. Actions are created in accordance with the `SFA` specification to ensure compatibility with most middleware. If redux-thunk middleware is configured, it can be used normally in `createPrimAction` :

```javascript
var todoActions = createPrimActions('todo', ({ initState }) => ({
  loadPage(todo) {
    return async (dispatch, getState) => {
      var pageState = await loadPageState();
      dispatch(initState(pageState));
    }
  }
}));
```

# Original design intention

Redux-prim is not designed to resolve the problem of redux boilerplate. At first, under a large project of react + redux architecture, we implemented a large number of scene abstraction and code reuse of similar pages. After a lot of practice and evolution, I summarized this set of best practices into ** data contract design**. Redux-prim is the product of its evolution.

## Data contract design

At first I thought that this design contained data-driven and a contractual idea. Later I found that Bertrond Myer also proposed contractual design and was widely recognized at OOP. What surprised me was the amazing fit of the two, especially in the design principle. Data contract design can be thought of as a way to implement abstract design under FP.

## When to use

In cloud platform systems, CMS, ERP, etc. We will encounter a lot of similar scenes, such as table pages or form pages, which are basically the same in design style and experience. You need to abstract and reuse the code for these pages, while following the pattern of react + redux.

## What problem has been solved?

Redux is a library that manages state through action and reducer. It specifies that state is an immutable single object tree. The state modification must declare the intent by dispatch an action, and return the new state through the pure function reducer to achieve the purpose of modification. This makes the app more predictable and better supports hot reload, time travel and server-side rendering. But the problems that come with it are also obvious:

- **Too much mode code**

In an app with hundreds of curd list pages, assuming that a page requires 10+ actions, 1 reducer, and several container components, we need to implement thousands or even more actions and actionCreator. Hundreds of reducers, as well as more container components (container components are usually subdivided for higher performance). With redux-prim, no matter how many pages, only need one page or even fewer actions, reducer and container components. Significantly increased development speed and maintenance costs.

## Code implementation steps

A typical page is as follows (screenshot from antd-pro):

![](http://p406.qhimgs4.com/t01958b0e04e22a2fb1.png)

For example, users, orders, and addresses are roughly similar. We tentatively call this page. To implement a page data contract, first:



### Abstract state

We have many similar pages in the system, such as todo, user, admin, order, etc. Usually in redux we will divide the data of the page into different data domains. such as:

```JavaScript
const app = combineReducers({
  todo: todoReducer,
  user: userReducer,
  admin: adminReducer,
  order: orderReducer
})
```

This approach results in duplicate definitions of functionally consistent container components on different pages because the data domains of connect are inconsistent. So we make a contract (the contract emphasizes that if we don't fulfill the responsibility, we get no benefit), all similar pages use the same data domain page, and at the same time only one scene can use this data domain:

### createContractReducer

```JavaScript
  import { createContractReducer } from 'reduc-prim';
  const app = combineReducers({
    page:  createContractReducer('page', getDefaultState)
  })
```

We continue to develop a contract that stipulates that every page has

- list：array, according to different pages, it can be any object.
- criteria：a search condition containing `key` `value`, which can be set freely on different pages.
- pagination：including `page`, `pageSize` and `total`.

```JavaScript
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

Because of the contract, the name,the structure, and data domain of each function are fixed, and code abstraction becomes easier and more thorough. 

Since `action` and `reducer` are weakened by `redux-prim`, the behavior of our next abstract contract data corresponds to `action creator`:

### createContractActions

```JavaScript
import { createContractActions } from 'redux-prim';
const pageContractActions =
  createContractActions('page', ({ primAction, initState, setState, mergeState }, { getListApi }) => {
    var actions = {
      initState(state) {
        // The page component must call the initState in the componentDidMount. 
        // In addition to providing their own initial state, it is more important to apply a row lock to the page data domain.
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

Because the interface for each page to get list data are different, `pageContractActions` is a high-order function that accepts two parameters, name and options.

```javascript
// todo actions
var todoActions = pageContractActions ('todo', { getListApi: api.getTodoList });

// orderActions
var orderActions = pageContractActions ('order', { getListApi: api.getOrderList });

```

Here we make a contract for `getListApi` that specifies its function signature as:

```javascript
  function getListApi(
    criteria: Object,
    pagination: {page: number, pageSize: number}
  ): Promise<{
    list: Array,
    page: number,
    pageSize: number
  }>
```

`Question: What if the back-end interfaces of our projects are inconsistent:`

`You can use high-order functions as adapter, otherwise you shouldn't access this implementation.`

### Implement common Container Components

Now we can implement a common table component for the contract data `list`:

```JavaScript
connect(
  state=>({list: state.page.list})
)
class PageTable extends React.Component {
  static propsType = {
    howToRender: PropTypes.any.isRequired
  }
}
```

This container component just knows how to get the data, but knows nothing about how the data is rendered, so it needs to be configured how to render it on the scene page :

```JavaScript
// User page
import PageTable from './PageTable';
import UserActions from './UserActions';
connect(
  ()=>({}) // only for dispach
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

虽然类似，但是编程范式都不一样，因为抽象从数据开始，所以我命名为`数据契约设计`，这是为了沟通的方便，如果被更多人认可，慢慢就会被接受和提出，目前先不要喷我造新词。

关于数据契约设计，我会在中国首届React开发者大会上进行分享，后续会有更加系统的文章发出。

最后在啰嗦几句，虽然目前这套理论还不完善，希望看到大家更多的参与进来，帮助这种设计理论的演化，哪怕是推翻并出现更好的方法论。















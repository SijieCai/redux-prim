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

In the example, the first parameter **todo** of `createPrimActions` and `createPrimReducer` is required as a namespace. The actions and reducers of the same namespace are matched. It is the basis for redux-prim to implement other features.

## Updater

Updater is the most important feature of redux-prim. These functions should represent an abstraction of the data operations, so that we can quickly implement business logic on this abstraction. For example, the `setState` of the above example is a built-in `updater`, and you will find that it generates a `action` that conforms to `SFA` and is processed by the corresponding `reducer` function.

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

## Redux ecosystem

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

Redux-prim is not designed to resolve the problem of redux boilerplate. We originally work on a lot of similar CRUD talbe pages using react + redux architecture, and try to abstract the scene to reuse most of redux code. After a few iterations and improvement, I summarized this set of best practices into ** data contract design**. Redux-prim is the product of its evolution.

## Data contract design

At first I thought that this design's core should be data-driven and contract. and the idea of Design by Contract(DbC) by Bertrond Myer has been widely recognized at OOP. What surprised me was the amazing fit of the two, especially in the design principle. Data contract design can be thought of as a way to implement abstract design under FP.

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
      renderHeader = () => 'Name',
      renderContent = item => item.name
    }, {
      renderHeader = () => 'Gender',
      renderContent = item => <Gender value={item.gender}/>
    }
  ]
  render() {
    return <PageTable howToRender={this.renderColumns}/>
  }
}
```

## Other schemes and similarities/differences
Regarding the code reuse of redux, there is a lot of practice and summary in the community. The most widely spread practice is officially proposed (in fact, @Dan Abramov)[reusing reducer logic](https://redux.js.org/recipes/structuringreducers/reusingreducerlogic), it emphasizes resuing the reducer. However, the reducer is a pure function that cannot handle side effects such as asynchronous problems. Most of the logic is transferred to the action creator, resulting in very limited(or very hard to implement) code reuse of the reducer.

So the community try to enhance the reducer based on this idea, such as [redux-loop](https://github.com/redux-loop/redux-loop), [redux-observable](https://redux-observable.js.org/). Redux-loop has many new concepts, behind redux-observable is rxjs and reative programming. This way is theoretically feasible. But I feel that in order to solve a complex problem, a more complicated mechanism is introduced, the learning curve is steeply increased, at the same time introduced more boilerplate. redux-prim, on the other hand, don't think the reducer is the only element that in a scene abstraction, but all elements that is involved such as state, action and reducer. These elements are cohesive and bounded by contract design. so at last, the problem should be solved more at the design level than on the framework (redux-prim has less than 200 lines of code implementation).

The elimination of the boilerplate is the reason why I open source redux-prim. After all, the code abstraction is difficult to copy and teach, and the system is easily destroyed in a small design error. In terms of code implementation, I realized that the design concept of [redux-updeep](https://github.com/algolia/redux-updeep) that appeared in the developer community in 2016 is closest to redux-prim. It uses the updeep library to merge arbitrary payloads in an immutable way, which is equivalent to implementing an updater based on updeep in redux-prim. The action still needs to be implemented by the developer. In contrast, redux-prim has better theoretical support. Data manipulation as an abstract layer regardless of implementation. Users can implement updater according to their own preferences. The concept of Action and reducer becomes transparent.

## At last
Design by Contract constantly remind you of that design is a trade-offs, such as: what versatility designers should sacrifice to gain benefits. 

The reason for breaking abstractions in large projects is usually caused by uncontrolled feature extends or defensive adoptive. The data contract-based design philosophy allows developers to revisit these changes and try to solve problems at other levels. The result is reduced system coupling while protecting abstraction and reusable code. I have a deep understanding of this in the practice of several large projects.

In the same scenario, if we don't use redux, and the data contract design pattern, can we achieve similar abstract effects? The answer is yes. In fact, I implemented it in OOP before I explored how to achieve in the paradigm of functional programming. The final difference is that the OOP approach is better understood, and the FP approach provides more predictability and composition. This is just a feeling of mine, maybe it can be proved by mathematics?

Here we list Bertrand Meyer's comparison of several principles of contractual design in object-oriented programming with data contract design, and find similar similarities:

-  Command–query separation (CQS)
Compare redux's action and reducer.

-  Uniform access principle (UAP)
The concept of derived data

-  Single Choice Principle (SCP)
Single data source, DRY

- Open/Closed Principle (OCP)
Open/Closed 

Although they are similar, the programming paradigm is different, because abstraction starts from the data, so I named it "data contract design", which is for the convenience of communication. If it is recognized by more people, it will gradually be accepted and proposed. Not to much blame on making new words.
 

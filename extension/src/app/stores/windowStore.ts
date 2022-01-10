import {
  createStore,
  compose,
  applyMiddleware,
  Store,
  StoreEnhancer,
  Reducer,
} from 'redux';
import localForage from 'localforage';
import { persistReducer, persistStore } from 'redux-persist';
import {
  api,
  CONNECT_REQUEST,
  exportStateMiddleware,
  InstancesState,
  StoreActionWithoutUpdateState,
  StoreState,
  UpdateStateAction,
} from '@redux-devtools/app';
import syncStores from '../middlewares/windowSync';
import instanceSelector from '../middlewares/instanceSelector';
import rootReducer from '../reducers/window';
import { BackgroundState } from '../reducers/background';
import { BackgroundAction } from './backgroundStore';
import { EmptyUpdateStateAction, NAAction } from '../middlewares/api';

export interface ExpandedUpdateStateAction extends UpdateStateAction {
  readonly instances: InstancesState;
}

export type WindowStoreAction =
  | StoreActionWithoutUpdateState
  | ExpandedUpdateStateAction
  | NAAction
  | EmptyUpdateStateAction;

const persistConfig = {
  key: 'redux-devtools',
  blacklist: ['instances', 'socket'],
  storage: localForage,
};

const persistedReducer: Reducer<StoreState, WindowStoreAction> = persistReducer(
  persistConfig,
  rootReducer
) as any;

export default function configureStore(
  baseStore: Store<BackgroundState, BackgroundAction>,
  position: string
) {
  let enhancer: StoreEnhancer;
  const middlewares = [exportStateMiddleware, api, syncStores(baseStore)];
  if (!position || position === '#popup') {
    // select current tab instance for devPanel and pageAction
    middlewares.push(instanceSelector);
  }
  if (process.env.NODE_ENV === 'production') {
    enhancer = applyMiddleware(...middlewares);
  } else {
    enhancer = compose(
      applyMiddleware(...middlewares),
      window.__REDUX_DEVTOOLS_EXTENSION__
        ? window.__REDUX_DEVTOOLS_EXTENSION__()
        : (noop: unknown) => noop
    );
  }
  const store = createStore(persistedReducer, enhancer);
  const persistor = persistStore(store, null, () => {
    if (store.getState().connection.type !== 'disabled') {
      store.dispatch({
        type: CONNECT_REQUEST,
      });
    }
  });

  return { store, persistor };
}

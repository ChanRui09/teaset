// TeaNavigator.js

'use strict';

import React, {Component, useContext, useEffect, useMemo, useCallback} from 'react';
import PropTypes from 'prop-types';
import {View, Text} from 'react-native';
import {
  NavigationContainer,
  StackActions,
  createNavigationContainerRef,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import TeaNavigatorScene from './TeaNavigatorScene';
import NavigatorContext from './NavigatorContext';
import Theme from 'teaset/themes/Theme';
import StatusBarConfigContext from './StatusBarConfigContext';

const Stack = createNativeStackNavigator();
const SCREEN_NAME = 'TeaNavigatorScreen';
const DEFAULT_SCENE_STYLE = {backgroundColor: '#f8f8f8'};

const RouteRegistryContext = React.createContext({
  getRouteByKey: () => null,
  updateRouteRef: () => {},
  getDefaultRouteKey: () => null,
  themeStamp: 0,
});

let themeStampCounter = 0;
const themeListeners = new Set();

function subscribeThemeChange(listener) {
  themeListeners.add(listener);
  return () => themeListeners.delete(listener);
}

function getCurrentThemeStamp() {
  return themeStampCounter;
}

if (!Theme.__teaNavigatorThemePatched) {
  const originalThemeSet = Theme.set.bind(Theme);
  Theme.set = function(theme) {
    originalThemeSet(theme);
    themeStampCounter += 1;
    themeListeners.forEach(listener => listener(themeStampCounter));
    console.log('[themeStampCounter]', themeStampCounter)
  };

  Theme.__teaNavigatorThemePatched = true;
}

function mapStatusBarStyleForNavigation(style) {
  if (style === 'light-content') return 'light';
  if (style === 'dark-content') return 'dark';
  if (style === 'default') return 'auto';
  return style || 'auto';
}

function buildNavigationStatusBarOptions(config) {
  if (!config) {
    return {
      statusBarHidden: false,
      statusBarStyle: 'auto',
      statusBarColor: undefined,
      statusBarAnimation: undefined,
      statusBarTranslucent: undefined,
    };
  }
  return {
    statusBarHidden: !!config.hidden,
    statusBarStyle: mapStatusBarStyleForNavigation(config.style),
    statusBarColor: config.color,
    statusBarAnimation: config.animation,
    statusBarTranslucent: config.translucent,
  };
}

function statusBarOptionsEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.statusBarHidden === b.statusBarHidden &&
    a.statusBarStyle === b.statusBarStyle &&
    a.statusBarColor === b.statusBarColor &&
    a.statusBarAnimation === b.statusBarAnimation &&
    a.statusBarTranslucent === b.statusBarTranslucent;
}

function DynamicScreen({route, navigation}) {
  const {getRouteByKey, updateRouteRef, getDefaultRouteKey, themeStamp} = useContext(RouteRegistryContext);
  const routeKey = route?.params?.routeKey;
  const resolvedRouteKey = routeKey ?? getDefaultRouteKey();

  const teaRoute = useMemo(() => {
    if (!resolvedRouteKey) {
      return null;
    }
    return getRouteByKey(resolvedRouteKey);
  }, [resolvedRouteKey, getRouteByKey]);

  useEffect(() => {
    if (!resolvedRouteKey) return;
    const unsubTransition = navigation.addListener('transitionStart', e => {
      if (e?.data?.closing === false) {
        const currentRoute = getRouteByKey(resolvedRouteKey);
        currentRoute?.viewRef?.onWillFocus?.();
      }
    });
    const unsubFocus = navigation.addListener('focus', () => {
      const currentRoute = getRouteByKey(resolvedRouteKey);
      currentRoute?.viewRef?.onDidFocus?.();
      const storedConfig = currentRoute?.statusBarConfig;
      if (storedConfig && typeof navigation.setOptions === 'function') {
        navigation.setOptions(buildNavigationStatusBarOptions(storedConfig));
      }
    });
    return () => {
      unsubTransition && unsubTransition();
      unsubFocus && unsubFocus();
    };
  }, [navigation, resolvedRouteKey, getRouteByKey]);

  const refCallback = useCallback(ref => {
    if (!resolvedRouteKey) return;
    updateRouteRef(resolvedRouteKey, ref);
  }, [resolvedRouteKey, updateRouteRef]);

  const setStatusBarConfig = useCallback(config => {
    if (!resolvedRouteKey) return false;
    const currentRoute = getRouteByKey(resolvedRouteKey);
    if (!currentRoute) return false;
    if (config) currentRoute.statusBarConfig = config;
    else delete currentRoute.statusBarConfig;
    if (typeof navigation.setOptions === 'function') {
      const nextOptions = buildNavigationStatusBarOptions(config);
      const lastOptions = currentRoute.__lastStatusBarOptions;
      if (!statusBarOptionsEqual(nextOptions, lastOptions)) {
        currentRoute.__lastStatusBarOptions = nextOptions;
        navigation.setOptions(nextOptions);
      }
      return true;
    }
    return false;
  }, [resolvedRouteKey, getRouteByKey, navigation]);

  const statusBarManager = useMemo(() => ({
    setStatusBarConfig,
    getStatusBarConfig: () => {
      const currentRoute = resolvedRouteKey ? getRouteByKey(resolvedRouteKey) : null;
      return currentRoute?.statusBarConfig || null;
    },
  }), [setStatusBarConfig, resolvedRouteKey, getRouteByKey]);

  useEffect(() => {
    const currentRoute = resolvedRouteKey ? getRouteByKey(resolvedRouteKey) : null;
    const storedConfig = currentRoute?.statusBarConfig;
    if (typeof navigation.setOptions === 'function') {
      const options = buildNavigationStatusBarOptions(storedConfig);
      const last = currentRoute?.__lastStatusBarOptions;
      if (!statusBarOptionsEqual(options, last)) {
        if (currentRoute) currentRoute.__lastStatusBarOptions = options;
        navigation.setOptions(options);
      }
    }
  }, [navigation, resolvedRouteKey, getRouteByKey]);

  if (!teaRoute || !teaRoute.view) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Text>Missing route view</Text>
      </View>
    );
  }

  return (
    <StatusBarConfigContext.Provider value={statusBarManager}>
      {React.cloneElement(teaRoute.view, {ref: refCallback, themeStamp})}
    </StatusBarConfigContext.Provider>
  );
}

export default class TeaNavigator extends Component {

  static propTypes = {
    rootView: PropTypes.element,
    sceneStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  };

  static defaultProps = {
    rootView: (
      <View style={{flex: 1, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center'}}>
        <Text style={{fontSize: 36, padding: 10}}>Teaset</Text>
        <Text style={{fontSize: 13, padding: 10}}>
          <Text style={{fontWeight: 'bold'}}>Set TeaNavigator.rootView to show main page.{'\n\n'}</Text>
          <Text style={{color: '#ff7800'}}>class</Text> <Text style={{color: '#3b5bb5'}}>Application</Text> <Text style={{color: '#ff7800'}}>extends</Text> Component{' {\n\n'}
          {'  '}<Text style={{color: '#3b5bb5'}}>render</Text>(){' {\n'}
          {'    '}<Text style={{color: '#ff7800'}}>return</Text> {'<TeaNavigator rootView={YourRootView} />;\n'}
          {'  }\n\n'}
          {'}'}
        </Text>
      </View>
    )
  };

  static SceneConfigs = TeaNavigatorScene;

  constructor(props) {
    super(props);
    this.navigationRef = createNavigationContainerRef();
    this.routeRegistry = new Map();
    this.desiredRouteKeys = [];
    this.currentRouteKeys = [];
    this.isNavigationReady = false;
    this.pendingForceReset = true;
    this.state = {
      enableAnimation: false,
      themeStamp: getCurrentThemeStamp(),
    };

    const initialRoute = this._normalizeRouteInput(this.props.rootView);
    const initialKey = this._ensureRouteKey(initialRoute);
    this.routeRegistry.set(initialKey, initialRoute);
    this.desiredRouteKeys = [initialKey];
    this.currentRouteKeys = [initialKey];

    this.navigator = this._buildNavigatorAPI();
  }

  componentDidMount() {
    this.themeUnsubscribe = subscribeThemeChange(stamp => {
      this.setState({themeStamp: stamp});
    });
  }

  componentDidUpdate(prevProps) {
    if (prevProps.rootView !== this.props.rootView) {
      const nextRoute = this._normalizeRouteInput(this.props.rootView);
      this._resetWithRoutes([nextRoute]);
    }
  }

  componentWillUnmount() {
    if (this.themeUnsubscribe) {
      this.themeUnsubscribe();
      this.themeUnsubscribe = null;
    }
  }

  _buildNavigatorAPI() {
    return {
      push: route => this.push(route),
      pop: () => this.pop(),
      popN: n => this.popN(n),
      popToTop: () => this.popToTop(),
      popToRoute: route => this.popToRoute(route),
      replace: route => this.replace(route),
      replaceAtIndex: (route, index) => this.replaceAtIndex(route, index),
      replacePrevious: route => this.replacePrevious(route),
      replacePreviousAndPop: route => this.replacePreviousAndPop(route),
      resetTo: route => this.resetTo(route),
      immediatelyResetRouteStack: stack => this.immediatelyResetRouteStack(stack),
      getCurrentRoutes: () => this.getCurrentRoutes(),
    };
  }

  _normalizeRouteInput(input) {
    if (input && typeof input === 'object' && !React.isValidElement(input) && input.view) {
      if (!input.scene && input.view && input.view.props && input.view.props.scene) {
        input.scene = input.view.props.scene;
      }
      return input;
    }
    if (React.isValidElement(input)) {
      return {view: input, scene: input.props && input.props.scene ? input.props.scene : null};
    }
    if (!input) {
      const fallbackView = this.constructor.defaultProps.rootView;
      return {view: fallbackView, scene: fallbackView && fallbackView.props ? fallbackView.props.scene : null};
    }
    console.error('TeaNavigator route requires a valid `view` element.');
    return {view: <View />, scene: null};
  }

  _ensureRouteKey(route) {
    if (!route) return null;
    if (route.__teaNavKey) return route.__teaNavKey;
    const key = `teaRoute-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    Object.defineProperty(route, '__teaNavKey', {
      value: key,
      enumerable: false,
      configurable: false,
      writable: false,
    });
    return key;
  }

  _getRouteKey(route) {
    if (!route) return null;
    if (route.__teaNavKey) return route.__teaNavKey;
    for (let [key, value] of this.routeRegistry.entries()) {
      if (value === route) return key;
    }
    return null;
  }

  _getRouteByKey = key => {
    if (!key) return null;
    return this.routeRegistry.get(key) || null;
  };

  _updateRouteRef = (key, ref) => {
    if (!key) return;
    const route = this.routeRegistry.get(key);
    if (route) {
      route.viewRef = ref || null;
    }
  };

  _getNavigationKeys() {
    const state = this.navigationRef.getRootState();
    if (!state || !state.routes) return [];
    return state.routes
      .map(r => r?.params?.routeKey)
      .filter(Boolean);
  }

  _cleanupRouteRegistry(activeKeys) {
    const activeSet = new Set(activeKeys);
    for (let key of Array.from(this.routeRegistry.keys())) {
      if (!activeSet.has(key)) {
        this.routeRegistry.delete(key);
      }
    }
  }

  _applyStackChange(forceReset = false) {
    if (!this.navigationRef.isReady()) {
      this.pendingForceReset = this.pendingForceReset || forceReset;
      return;
    }

    const desiredKeys = this.desiredRouteKeys;
    if (!desiredKeys.length) return;

    const currentKeys = this._getNavigationKeys();

    if (!forceReset) {
      const pushPossible = desiredKeys.length === currentKeys.length + 1 && desiredKeys.slice(0, -1).every((key, index) => key === currentKeys[index]);
      if (pushPossible) {
        const nextKey = desiredKeys[desiredKeys.length - 1];
        this.navigationRef.dispatch(StackActions.push(SCREEN_NAME, {routeKey: nextKey}));
        return;
      }

      const popPossible = desiredKeys.length < currentKeys.length && desiredKeys.every((key, index) => key === currentKeys[index]);
      if (popPossible) {
        const count = currentKeys.length - desiredKeys.length;
        if (count > 0) {
          this.navigationRef.dispatch(StackActions.pop(count));
        }
        return;
      }

      if (desiredKeys.length === currentKeys.length) {
        let diffIndex = -1;
        for (let i = 0; i < desiredKeys.length; ++i) {
          if (desiredKeys[i] !== currentKeys[i]) {
            diffIndex = i;
            break;
          }
        }
        if (diffIndex === -1) return;
        if (diffIndex === desiredKeys.length - 1) {
          const replaceKey = desiredKeys[desiredKeys.length - 1];
          this.navigationRef.dispatch(StackActions.replace(SCREEN_NAME, {routeKey: replaceKey}));
          return;
        }
        forceReset = true;
      }
    }

    this.navigationRef.resetRoot({
      index: desiredKeys.length - 1,
      routes: desiredKeys.map(key => ({name: SCREEN_NAME, params: {routeKey: key}})),
    });
    this.pendingForceReset = false;
  }

  _handleNavigationReady = () => {
    this.isNavigationReady = true;
    this._applyStackChange(this.pendingForceReset);
    if (!this.state.enableAnimation) {
      this.setState({enableAnimation: true});
    }
  };

  _handleNavigationStateChange = () => {
    const actualKeys = this._getNavigationKeys();
    if (!actualKeys.length) return;
    this.currentRouteKeys = actualKeys.slice();
    this.desiredRouteKeys = actualKeys.slice();
    this._cleanupRouteRegistry(actualKeys);
  };

  push(route) {
    const normalized = this._normalizeRouteInput(route);
    const key = this._ensureRouteKey(normalized);
    this.routeRegistry.set(key, normalized);
    this.desiredRouteKeys = this.desiredRouteKeys.concat(key);
    this._applyStackChange();
    return normalized;
  }

  pop() {
    this.popN(1);
  }

  popN(n) {
    const count = parseInt(n, 10);
    if (!count || count <= 0) return;
    if (this.desiredRouteKeys.length <= 1) return;
    const target = Math.max(1, this.desiredRouteKeys.length - count);
    this.desiredRouteKeys = this.desiredRouteKeys.slice(0, target);
    this._applyStackChange();
  }

  popToTop() {
    if (this.desiredRouteKeys.length <= 1) return;
    this.desiredRouteKeys = this.desiredRouteKeys.slice(0, 1);
    this._applyStackChange();
  }

  popToRoute(route) {
    const key = this._getRouteKey(route);
    if (!key) return;
    const index = this.desiredRouteKeys.indexOf(key);
    if (index < 0) return;
    this.desiredRouteKeys = this.desiredRouteKeys.slice(0, index + 1);
    this._applyStackChange();
  }

  replace(route) {
    this.replaceAtIndex(route, this.desiredRouteKeys.length - 1);
  }

  replaceAtIndex(route, index) {
    if (this.desiredRouteKeys.length === 0) {
      this.push(route);
      return;
    }
    let targetIndex = index;
    if (targetIndex < 0) {
      targetIndex = this.desiredRouteKeys.length + targetIndex;
    }
    if (targetIndex < 0 || targetIndex >= this.desiredRouteKeys.length) return;
    const normalized = this._normalizeRouteInput(route);
    const key = this._ensureRouteKey(normalized);
    this.routeRegistry.set(key, normalized);
    const keys = this.desiredRouteKeys.slice();
    keys[targetIndex] = key;
    this.desiredRouteKeys = keys;
    const forceReset = targetIndex !== keys.length - 1;
    this._applyStackChange(forceReset);
  }

  replacePrevious(route) {
    if (this.desiredRouteKeys.length < 2) return;
    this.replaceAtIndex(route, this.desiredRouteKeys.length - 2);
  }

  replacePreviousAndPop(route) {
    if (this.desiredRouteKeys.length < 2) return;
    this.replaceAtIndex(route, this.desiredRouteKeys.length - 2);
    this.pop();
  }

  resetTo(route) {
    const normalized = this._normalizeRouteInput(route);
    const key = this._ensureRouteKey(normalized);
    this.routeRegistry.set(key, normalized);
    this.desiredRouteKeys = [key];
    this._applyStackChange(true);
  }

  immediatelyResetRouteStack(stack) {
    const routes = Array.isArray(stack) ? stack : [];
    if (routes.length === 0) {
      const fallback = this._normalizeRouteInput(this.props.rootView);
      this._resetWithRoutes([fallback]);
      return;
    }
    this._resetWithRoutes(routes);
  }

  getCurrentRoutes() {
    return this.desiredRouteKeys
      .map(key => this.routeRegistry.get(key))
      .filter(Boolean);
  }

  _resetWithRoutes(routeArray) {
    this.routeRegistry = new Map();
    this.desiredRouteKeys = [];
    routeArray.forEach(routeItem => {
      const normalized = this._normalizeRouteInput(routeItem);
      const key = this._ensureRouteKey(normalized);
      this.routeRegistry.set(key, normalized);
      this.desiredRouteKeys.push(key);
    });
    if (!this.desiredRouteKeys.length) {
      const fallback = this._normalizeRouteInput(this.constructor.defaultProps.rootView);
      const fallbackKey = this._ensureRouteKey(fallback);
      this.routeRegistry.set(fallbackKey, fallback);
      this.desiredRouteKeys = [fallbackKey];
    }
    this.currentRouteKeys = this.desiredRouteKeys.slice();
    this._applyStackChange(true);
  }

  render() {
    const sceneStyleProp = this.props.sceneStyle;
    const sceneStyle = Array.isArray(sceneStyleProp)
      ? Object.assign({}, DEFAULT_SCENE_STYLE, ...sceneStyleProp)
      : (sceneStyleProp || DEFAULT_SCENE_STYLE);
    const registryValue = {
      getRouteByKey: this._getRouteByKey,
      updateRouteRef: this._updateRouteRef,
      getDefaultRouteKey: () => (this.desiredRouteKeys.length ? this.desiredRouteKeys[0] : null),
      themeStamp: this.state.themeStamp,
    };
    return (
      <NavigatorContext.Provider value={() => this.navigator}>
        <View style={{flex: 1, backgroundColor: 'black'}}>
          <RouteRegistryContext.Provider value={registryValue}>
            <NavigationContainer
              ref={this.navigationRef}
              onReady={this._handleNavigationReady}
              onStateChange={this._handleNavigationStateChange}
            >
              <Stack.Navigator
                screenOptions={{
                  headerShown: false,
                  animation: this.state.enableAnimation ? 'slide_from_right' : 'none',
                  contentStyle: sceneStyle,
                  orientation: 'default',
                }}
              >
                <Stack.Screen
                  name={SCREEN_NAME}
                  component={DynamicScreen}
                  initialParams={{routeKey: this.desiredRouteKeys[0] || null}}
                />
              </Stack.Navigator>
            </NavigationContainer>
          </RouteRegistryContext.Provider>
        </View>
      </NavigatorContext.Provider>
    );
  }
}
// NavigationBar.js

'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {StyleSheet, Platform, StatusBar, View, Animated, Dimensions} from 'react-native';
import {ViewPropTypes, TextPropTypes} from 'deprecated-react-native-prop-types'
import {NavigationContext} from '@react-navigation/native';

import Theme from '@react-native-ohos/teaset/themes/Theme';
import TintColorContext from './TintColorContext';
import NavigationTitle from './NavigationTitle';
import NavigationButton from './NavigationButton';
import NavigationLinkButton from './NavigationLinkButton';
import NavigationIconButton from './NavigationIconButton';
import NavigationBackButton from './NavigationBackButton';
import StatusBarConfigContext from '../TeaNavigator/StatusBarConfigContext';

class NavigationBarInner extends Component {

  static contextType = NavigationContext;

  static propTypes = {
    ...ViewPropTypes,
    type: PropTypes.oneOf(['auto', 'ios', 'android', 'harmony']),
    title: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
    titleStyle: TextPropTypes.style,
    leftView: PropTypes.element,
    rightView: PropTypes.element,
    tintColor: PropTypes.string, //bar tint color, default tint color leftView and rightView, set to null for no tint color
    background: PropTypes.element,
    hidden: PropTypes.bool, //bar hidden
    animated: PropTypes.bool, //hide or show bar with animation
    statusBarStyle: PropTypes.oneOf(['default', 'light-content','dark-content',]), //status bar style (iOS only)
    statusBarColor: PropTypes.string, //status bar color, default: style.backgroundColor
    statusBarHidden: PropTypes.bool, //status bar hidden
    statusBarInsets: PropTypes.bool, //auto add space for iOS status bar
    statusBarManager: PropTypes.shape({
      setStatusBarConfig: PropTypes.func,
      getStatusBarConfig: PropTypes.func,
    }),
  };

  static defaultProps = {
    ...View.defaultProps,
    type: 'ios',
    hidden: false,
    animated: true,
    statusBarInsets: true,
  };

  constructor(props) {
    super(props);
    this.screenWidth = Dimensions.get('window').width;
    this.state = {
      leftViewWidth: 0,
      rightViewWidth: 0,
      barTop: new Animated.Value(props.hidden ? -(Theme.navBarContentHeight + Theme.statusBarHeight) : 0),
      barOpacity: new Animated.Value(props.hidden ? 0 : 1),
    };
    this._lastResolvedStatusBarConfig = null;
  }

  componentDidMount() {
    const fs = StyleSheet.flatten(this.buildStyle());
    const config = this.extractStatusBarConfig(fs);
    this.applyStatusBarConfig(config);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.hidden != this.props.hidden) {
      this.checkBarHidden();
    }
    const fs = StyleSheet.flatten(this.buildStyle());
    const nextConfig = this.extractStatusBarConfig(fs);
    const watchedPropsChanged = (
      prevProps.statusBarHidden !== this.props.statusBarHidden ||
      prevProps.background !== this.props.background ||
      prevProps.statusBarColor !== this.props.statusBarColor ||
      prevProps.statusBarStyle !== this.props.statusBarStyle ||
      prevProps.statusBarInsets !== this.props.statusBarInsets ||
      prevProps.animated !== this.props.animated
    );
    const configChanged = !statusBarConfigEqual(nextConfig, this._lastResolvedStatusBarConfig);
    if (watchedPropsChanged || configChanged) {
      this.applyStatusBarConfig(nextConfig);
    }
  }

  componentWillUnmount() {
    this.resetStatusBarConfig();
  }

  applyStatusBarConfig(configParam) {
    const config = configParam || this.extractStatusBarConfig(StyleSheet.flatten(this.buildStyle()));
    this._lastResolvedStatusBarConfig = config;
    const propagated = this.propagateStatusBarConfig(config);
    if (propagated) {
      return;
    }
    const navigationHandled = this.applyStatusBarViaNavigation(config);
    if (!navigationHandled) {
      this.applyNativeStatusBar(config);
    }
  }

  resetStatusBarConfig() {
    const propagated = this.propagateStatusBarConfig(null);
    this._lastResolvedStatusBarConfig = null;
    if (propagated) {
      return;
    }
    const navigation = this.context;
    this._lastNavigationStatusBarConfig = null;
    if (navigation && typeof navigation.setOptions === 'function') {
      navigation.setOptions({
        statusBarHidden: false,
        statusBarStyle: 'default',
        statusBarColor: undefined,
        statusBarAnimation: undefined,
        statusBarTranslucent: undefined,
      });
      return;
    }
    StatusBar.setHidden(false, 'none');
    StatusBar.setBarStyle('default', false);
    const isAndroidFamily = Platform.OS === 'android' || Platform.OS === 'harmony';
    if (isAndroidFamily) {
      StatusBar.setBackgroundColor('rgba(0,0,0,0)', false);
    }
  }

  propagateStatusBarConfig(config) {
    const {statusBarManager} = this.props;
    if (!statusBarManager || typeof statusBarManager.setStatusBarConfig !== 'function') {
      return false;
    }
    try {
      const handled = !!statusBarManager.setStatusBarConfig(config);
      if (handled) {
        this._lastNavigationStatusBarConfig = null;
      }
      return handled;
    } catch (e) {
      return false;
    }
  }

  applyStatusBarViaNavigation(config) {
    const navigation = this.context;
    if (navigation && typeof navigation.setOptions === 'function') {
      const navConfig = {
        statusBarHidden: config.hidden,
        statusBarStyle: mapStatusBarStyleForNavigation(config.style),
        statusBarColor: config.color,
        statusBarAnimation: config.animation,
        statusBarTranslucent: config.translucent,
      };
      if (!shallowEqual(navConfig, this._lastNavigationStatusBarConfig)) {
        navigation.setOptions(navConfig);
        this._lastNavigationStatusBarConfig = navConfig;
      }
      return true;
    }
    return false;
  }

  applyNativeStatusBar(config) {
    StatusBar.setHidden(config.hidden, config.animation);
    StatusBar.setBarStyle(config.style, config.animated);
    const isAndroidFamily = Platform.OS === 'android' || Platform.OS === 'harmony';
    if (isAndroidFamily && config.color !== undefined && config.color !== null) {
      StatusBar.setBackgroundColor(config.color, config.animated);
    }
  }

  extractStatusBarConfig(fs) {
    let {statusBarColor, statusBarStyle, statusBarHidden, statusBarInsets, animated} = this.props;
    if (!statusBarColor) statusBarColor = statusBarInsets && (Platform.OS === 'ios' || Platform.Version > 20) ? 'rgba(0,0,0,0)' : fs.backgroundColor;
    if (!statusBarStyle) statusBarStyle = Theme.navStatusBarStyle ? Theme.navStatusBarStyle : 'default';
    return {
      hidden: !!statusBarHidden,
      style: statusBarStyle,
      color: statusBarColor,
      animation: animated ? 'fade' : 'none',
      animated: !!animated,
      translucent: true,
    };
  }

  buildStyle() {
    let {style, type, statusBarInsets} = this.props;

    let justifyContent;
    let platformType = type === 'auto' ? Platform.OS : type;
    // Map harmony platform to ios style
    if (platformType === 'harmony') platformType = 'ios';
    switch (platformType) {
      case 'ios': justifyContent = 'space-between'; break;
      case 'android': justifyContent = 'flex-end'; break;
    }
    let {left: leftInset, right: rightInset} = Theme.screenInset;
    style = [{
      backgroundColor: Theme.navColor,
      position: 'absolute',
      left: 0,
      right: 0,
      height: Theme.navBarContentHeight + (statusBarInsets ? Theme.statusBarHeight : 0),
      paddingTop: statusBarInsets ? Theme.statusBarHeight : 0,
      paddingLeft: 4 + leftInset,
      paddingRight: 4 + rightInset,
      borderBottomWidth: Theme.navSeparatorLineWidth,
      borderBottomColor: Theme.navSeparatorColor,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent,
    }].concat(style).concat({
      top: this.state.barTop, //hidden or shown
    });

    return style;
  }

  checkBarHidden() {
    let {hidden, animated, statusBarHidden} = this.props;
    let {barTop, barOpacity} = this.state;
    let barTopValue = hidden ? -this.barHeight : 0;
    let barOpacityValue = hidden ? 0 : 1;
    if (barTop._value != barTopValue || barOpacity._value != barOpacityValue) {
      if (animated) {
        Animated.parallel([
          Animated.spring(barTop, {toValue: barTopValue, friction: 9, useNativeDriver: false,}),
          Animated.spring(barOpacity, {toValue: barOpacityValue, friction: 9, useNativeDriver: false,}),
        ]).start();
      } else {
        barTop.setValue(barTopValue);
        barOpacity.setValue(barOpacityValue);
      }      
    }
  }

  onLayout(e) {
    if (e.nativeEvent.layout.height != this.barHeight) {
      this.barHeight = e.nativeEvent.layout.height;
      this.checkBarHidden();
    }
    let {width} = Dimensions.get('window');
    if (width != this.screenWidth) {
      this.screenWidth = width;
      this.forceUpdate();
    }
    this.props.onLayout && this.props.onLayout(e);
  }

  onLeftViewLayout(e) {
    if (e.nativeEvent.layout.width != this.state.leftViewWidth) {
      this.setState({leftViewWidth: e.nativeEvent.layout.width});
    }
  }

  onRightViewLayout(e) {
    if (e.nativeEvent.layout.width != this.state.rightViewWidth) {
      this.setState({rightViewWidth: e.nativeEvent.layout.width});
    }
  }

  renderStatusBar(fs) {
    let {statusBarColor, statusBarStyle, statusBarHidden, statusBarInsets, animated} = this.props;
    const navigation = this.context;
    if (navigation && typeof navigation.setOptions === 'function') {
      return null;
    }



    if (!statusBarColor) statusBarColor = statusBarInsets && (Platform.OS === 'ios' || Platform.Version > 20) ? 'rgba(0,0,0,0)' : fs.backgroundColor;
    if (!statusBarStyle) statusBarStyle = Theme.navStatusBarStyle ? Theme.navStatusBarStyle : 'default';

    return (
      <StatusBar backgroundColor={statusBarColor} translucent={true} barStyle={statusBarStyle} animated={animated} hidden={statusBarHidden} />
    );
  }

  renderBackground() {
    let backgroundViewStyle = {
      backgroundColor: 'rgba(0, 0, 0, 0)',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      opacity: this.state.barOpacity,
    };
    return <Animated.View style={backgroundViewStyle}>{this.props.background}</Animated.View>;
  }

  renderTitle(fs) {
    let {type, title, titleStyle, statusBarInsets} = this.props;
    let {leftViewWidth, rightViewWidth} = this.state;

    let barPaddingLeft = fs.paddingLeft ? fs.paddingLeft : (fs.padding ? fs.padding : 0);
    let barPaddingRight = fs.paddingRight ? fs.paddingRight : (fs.padding ? fs.padding : 0);
    let paddingLeft, paddingRight;
    let platformType = type === 'auto' ? Platform.OS : type;
    // Map harmony platform to ios style
    if (platformType === 'harmony') platformType = 'ios';
    switch (platformType) {
      case 'ios':
        let paddingLeftRight = Math.max(leftViewWidth + barPaddingLeft, rightViewWidth + barPaddingRight);
        paddingLeft = paddingLeftRight;
        paddingRight = paddingLeftRight;
        break;
      case 'android':
        paddingLeft = barPaddingLeft;
        paddingRight = leftViewWidth + rightViewWidth + barPaddingRight;
        break;
    }
    let titleViewStyle = {
      backgroundColor: 'rgba(0, 0, 0, 0)',
      position: 'absolute',
      top: statusBarInsets ? Theme.statusBarHeight : 0,
      left: 0,
      right: 0,
      height: Theme.navBarContentHeight,
      paddingLeft: paddingLeft,
      paddingRight: paddingRight,
      opacity: this.state.barOpacity,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    };

    //convert string title to NavigationBar.Title
    if (typeof title === 'string') {
      let textAlign;
      let platformType = type === 'auto' ? Platform.OS : type;
      // Map harmony platform to ios style
      if (platformType === 'harmony') platformType = 'ios';
      switch (platformType) {
        case 'ios': textAlign = 'center'; break;
        case 'android': textAlign = 'left'; break;
      }
      title = <this.constructor.Title style={[{textAlign, color: Theme.navTitleColor}].concat(titleStyle)} text={title} />;
    }

    return <Animated.View style={titleViewStyle}>{title}</Animated.View>;
  }

  renderLeftView() {
    let {leftView} = this.props;
    let {barOpacity: opacity} = this.state;
    return <Animated.View style={{opacity}} onLayout={e => this.onLeftViewLayout(e)}>{leftView}</Animated.View>;
  }

  renderRightView() {
    let {rightView} = this.props;
    let {barOpacity: opacity} = this.state;
    return <Animated.View style={{opacity}} onLayout={e => this.onRightViewLayout(e)}>{rightView}</Animated.View>;
  }

  render() {
  let {style, children, type, title, titleStyle, leftView, rightView, tintColor, background, hidden, animated, statusBarStyle, statusBarColor, statusBarHidden, statusBarInsets, onLayout, statusBarManager, ...others} = this.props;
    let fs = StyleSheet.flatten(this.buildStyle());
    const contextTintColor = tintColor === undefined ? Theme.navTintColor : tintColor;
    return (
      <TintColorContext.Provider value={{tintColor: contextTintColor}}>
        <Animated.View style={fs} onLayout={e => this.onLayout(e)} {...others}>
          {this.renderStatusBar(fs)}
          {this.renderBackground()}
          {this.renderTitle(fs)}
          {this.renderLeftView()}
          {this.renderRightView()}
        </Animated.View>
      </TintColorContext.Provider>
    );
  }
}

NavigationBarInner.Title = NavigationTitle;
NavigationBarInner.Button = NavigationButton;
NavigationBarInner.LinkButton = NavigationLinkButton;
NavigationBarInner.IconButton = NavigationIconButton;
NavigationBarInner.BackButton = NavigationBackButton;

const NavigationBar = React.forwardRef((props, ref) => (
  <StatusBarConfigContext.Consumer>
    {statusBarManager => (
      <NavigationBarInner {...props} statusBarManager={statusBarManager} ref={ref} />
    )}
  </StatusBarConfigContext.Consumer>
));

NavigationBar.displayName = 'NavigationBar';
NavigationBar.propTypes = NavigationBarInner.propTypes;
NavigationBar.defaultProps = NavigationBarInner.defaultProps;
NavigationBar.Title = NavigationBarInner.Title;
NavigationBar.Button = NavigationBarInner.Button;
NavigationBar.LinkButton = NavigationBarInner.LinkButton;
NavigationBar.IconButton = NavigationBarInner.IconButton;
NavigationBar.BackButton = NavigationBarInner.BackButton;

export default NavigationBar;

function shallowEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (let key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

function statusBarConfigEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.hidden === b.hidden &&
    a.style === b.style &&
    a.color === b.color &&
    a.animation === b.animation &&
    a.animated === b.animated &&
    a.translucent === b.translucent;
}

function mapStatusBarStyleForNavigation(style) {
  if (style === 'light-content') return 'light';
  if (style === 'dark-content') return 'dark';
  return style || 'auto';
}

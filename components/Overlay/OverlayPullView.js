// OverlayPullView.js

'use strict';

import React, {Component} from "react";
import PropTypes from 'prop-types';
import {Animated, View, Platform} from 'react-native';
import {ViewPropTypes} from 'deprecated-react-native-prop-types'

import Theme from '../../themes/Theme';
import TopView from './TopView';
import OverlayView from './OverlayView';

const useHarmonyDriver = Platform.OS === 'harmony';

export default class OverlayPullView extends OverlayView {

  static propTypes = {
    ...OverlayView.propTypes,
    side: PropTypes.oneOf(['top', 'bottom', 'left', 'right']),
    containerStyle: ViewPropTypes.style,
    rootTransform: PropTypes.oneOfType([
      PropTypes.oneOf(['none', 'translate', 'scale']),
      PropTypes.arrayOf(PropTypes.shape({
        translateX: PropTypes.number,
        translateY: PropTypes.number,
        scaleX: PropTypes.number,
        scaleY: PropTypes.number,
      })),
    ]),
  };

  static defaultProps = {
    ...OverlayView.defaultProps,
    side: 'bottom',
    animated: true,
    rootTransform: 'none',
  };

  constructor(props) {
    super(props);
    this.viewLayout = {x: 0, y: 0, width: 0, height: 0};
    Object.assign(this.state, {
      translateValue: new Animated.Value(0),
      showed: false,
    });
  }

  get appearAnimates() {
    let animates = super.appearAnimates;
    animates.push(
      Animated.timing(this.state.translateValue, {
        toValue: 0,
        duration:180,
        useNativeDriver: useHarmonyDriver,
      })
    );
    return animates;
  }
  
  get disappearAnimates() {
    let animates = super.disappearAnimates;
    animates.push(
      Animated.timing(this.state.translateValue, {
        toValue: this.translateHiddenValue,
        duration:180,
        useNativeDriver: useHarmonyDriver,
      })
    );
    return animates;
  }

  get appearAfterMount() {
    return false;
  }

  get translateHiddenValue() {
    let {side} = this.props;
    let {width, height} = this.viewLayout || {};
    if (side === 'left') return -(width || 0);
    if (side === 'right') return (width || 0);
    if (side === 'top') return -(height || 0);
    return (height || 0);
  }

  get rootTransformValue() {
    let {side, rootTransform} = this.props;
    if (!rootTransform || rootTransform === 'none') {
      return [];
    }
    let transform;
    switch (rootTransform) {
      case 'translate':
        switch (side) {
          case 'top': return [{translateY: this.viewLayout.height}];
          case 'left': return [{translateX: this.viewLayout.width}];
          case 'right': return [{translateX: -this.viewLayout.width}];
          default: return [{translateY: -this.viewLayout.height}];
        }
        break;
      case 'scale':
        return [{scaleX: Theme.overlayRootScale}, {scaleY: Theme.overlayRootScale}];
      default:
        return rootTransform;
    }
  }

  appear(animated = this.props.animated) {
    if (animated) {
      this.state.translateValue.setValue(this.translateHiddenValue);
    } else {
      this.state.translateValue.setValue(0);
    }
    super.appear(animated);

    let {rootTransform} = this.props;
    if (rootTransform && rootTransform !== 'none') {
      TopView.transform(this.rootTransformValue, animated);
    }
  }

  disappear(animated = this.props.animated) {
    let {rootTransform} = this.props;
    if (rootTransform && rootTransform !== 'none') {
      TopView.restore(animated);
    }

    super.disappear(animated);
  }

  onLayout(e) {
    this.viewLayout = e.nativeEvent.layout;
    if (!this.state.showed) {
      this.setState({showed: true});
      this.appear();
    }
  }

  buildStyle() {
    let {side} = this.props;
    let sideStyle;
    //Set flexDirection so that the content view will fill the side
    switch (side) {
      case 'top':
        sideStyle = {flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'stretch'};
        break;
      case 'left':
        sideStyle = {flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'stretch'};
        break;
      case 'right':
        sideStyle = {flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'stretch'};
        break;
      default:
        sideStyle = {flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'stretch'};
    }
    return super.buildStyle().concat(sideStyle);
  }

  renderContent(content = null) {
    let {side, containerStyle, children} = this.props;

    let translateStyle;
    switch (side) {
      case 'top':
      case 'bottom':
        translateStyle = {transform: [{translateY: this.state.translateValue}]};
        break;
      case 'left':
      case 'right':
        translateStyle = {transform: [{translateX: this.state.translateValue}]};
        break;
      default:
        translateStyle = {transform: [{translateY: this.state.translateValue}]};
    }
    let visibilityStyle = {opacity: this.state.showed ? 1 : 0};
    containerStyle = [{
      backgroundColor: Theme.defaultColor,
    }].concat(containerStyle).concat([visibilityStyle, translateStyle]);

    return (
      <Animated.View style={containerStyle} onLayout={(e) => this.onLayout(e)}>
        {content ? content : children}
      </Animated.View>
    );
  }

}

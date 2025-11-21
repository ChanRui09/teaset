// SegmentedItem.js

'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {View, Text} from 'react-native';
import {ViewPropTypes,TextPropTypes} from 'deprecated-react-native-prop-types'

import Theme from '@react-native-ohos/teaset/themes/Theme';
import Badge from '../Badge/Badge';

export default class SegmentedItem extends Component {

  static propTypes = {
    ...ViewPropTypes,
    title: PropTypes.oneOfType([PropTypes.element, PropTypes.string, PropTypes.number]),
    titleStyle: TextPropTypes.style,
    activeTitleStyle: TextPropTypes.style,
    active: PropTypes.bool,
    badge: PropTypes.oneOfType([PropTypes.element, PropTypes.string, PropTypes.number]),
    onAddWidth: PropTypes.func, //(width)
  };

  static defaultProps = {
    ...View.defaultProps,
    active: false,
  };

  constructor(props) {
    super(props);
    this.state = {
      badgeWidth: 0,
    };
    this.customBadgeMeasured = false;
  }

  componentDidUpdate(prevProps) {
    const prevIsElement = React.isValidElement(prevProps.badge);
    const currIsElement = React.isValidElement(this.props.badge);

    if (!this.props.badge) {
      this.customBadgeMeasured = false;
      this.updateBadgeWidth(0);
      return;
    }

    if (prevIsElement !== currIsElement) {
      this.customBadgeMeasured = false;
      if (!currIsElement) {
        this.updateBadgeWidth(0);
      }
      return;
    }

    if (currIsElement && prevIsElement) {
      const prevKey = prevProps.badge && prevProps.badge.key;
      const currKey = this.props.badge && this.props.badge.key;
      if (prevKey !== currKey) {
        this.customBadgeMeasured = false;
      }
    }
  }

  updateBadgeWidth(width) {
    const normalizedWidth = Math.round(width);
    if (!Number.isFinite(normalizedWidth) || normalizedWidth === this.state.badgeWidth) {
      return;
    }
    this.setState({badgeWidth: normalizedWidth});
    this.props.onAddWidth && this.props.onAddWidth(normalizedWidth);
  }

  buildStyle() {
    let {style} = this.props;
    let {badgeWidth} = this.state;
    style = [{
      paddingTop: Theme.sbBtnPaddingTop,
      paddingBottom: Theme.sbBtnPaddingBottom,
      paddingLeft: Theme.sbBtnPaddingLeft + badgeWidth / 2,
      paddingRight: Theme.sbBtnPaddingRight + badgeWidth / 2,
      overflow: 'visible',
      alignItems: 'center',
      justifyContent: 'center',
    }].concat(style);
    return style;
  }

  renderTitle() {
    let {title, titleStyle, activeTitleStyle, active} = this.props;
    if (title === null || title === undefined) return null;
    else if (React.isValidElement(title)) return title;

    let textStyle;
    if (active) {
      textStyle = [{
        color: Theme.sbBtnActiveTitleColor,
        fontSize: Theme.sbBtnActiveTextFontSize,
      }].concat(activeTitleStyle);
    } else {
      textStyle = [{
        color: Theme.sbBtnTitleColor,
        fontSize: Theme.sbBtnTextFontSize,
      }].concat(titleStyle);
    }
    return <Text key='title' style={textStyle} numberOfLines={1}>{title}</Text>;
  }

  renderBadge() {
    let {badge} = this.props;
    if (!badge) return null;

    let badgeStyle = {
      position: 'absolute',
      right: 0,
      top: 0,
    };

    const handleLayout = e => {
      let {width} = e.nativeEvent.layout;
      this.updateBadgeWidth(width);
    };

    if (React.isValidElement(badge)) {
      const needsMeasure = !this.customBadgeMeasured;
      const elementLayoutProps = needsMeasure ? {
        onLayout: e => {
          this.customBadgeMeasured = true;
          this.updateBadgeWidth(e.nativeEvent.layout.width);
        }
      } : {};
      return (
        <View style={badgeStyle} pointerEvents='none' {...elementLayoutProps}>
          {badge}
        </View>
      );
    }

    return (
      <Badge
        style={badgeStyle}
        count={badge}
        onLayout={handleLayout}
      />
    );
  }

  render() {
    let {style, children, title, titleStyle, activeTitleStyle, active, badge, onAddWidth, ...others} = this.props;
    return (
      <View style={this.buildStyle()} {...others}>
        {this.renderTitle()}
        {this.renderBadge()}
      </View>
    );
  }
}
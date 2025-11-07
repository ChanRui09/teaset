// NavigationLinkButton.js

'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {Text} from 'react-native';

import Theme from '@react-native-ohos/teaset/themes/Theme';
import NavigationButton from './NavigationButton';

export default class NavigationLinkButton extends NavigationButton {

  static propTypes = {
    ...NavigationButton.propTypes,
    title: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  };

  renderTitle() {
    let {title} = this.props;
    if (title === null || title === undefined) return super.renderTitle();
    
    const contextTintColor = this.context ? this.context.tintColor : undefined;
    let textStyle = {
      fontSize: Theme.navButtonFontSize,
      overflow: 'hidden',
    };
    if (contextTintColor !== null && contextTintColor !== undefined) {
      textStyle.color = contextTintColor;
    }
    return <Text style={textStyle} numberOfLines={1} allowFontScaling={false}>{title}</Text>;
  }

}


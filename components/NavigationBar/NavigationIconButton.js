// NavigationIconButton.js

'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {Image} from 'react-native';
import {ImagePropTypes} from 'deprecated-react-native-prop-types'
import Theme from '@react-native-ohos/teaset/themes/Theme';
import NavigationButton from './NavigationButton';

export default class NavigationIconButton extends NavigationButton {

  static propTypes = {
    ...NavigationButton.propTypes,
    icon: ImagePropTypes.source,
  }

  renderTitle() {
    let {icon} = this.props;
    if (icon === null || icon === undefined) return super.renderTitle();
    
    const contextTintColor = this.context ? this.context.tintColor : undefined;
    let iconStyle = {
      width: 20,
      height: 20,
    };
    if (contextTintColor !== null && contextTintColor !== undefined) {
      iconStyle.tintColor = contextTintColor;
    }
    return <Image style={iconStyle} source={icon} />;
  }

}


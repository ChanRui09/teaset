// NavigationTitle.js

'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {Text} from 'react-native';

import Theme from 'teaset/themes/Theme';
import TintColorContext from './TintColorContext';

export default class NavigationTitle extends Component {

  static propTypes = {
    ...Text.propTypes,
    text: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  };

  static defaultProps = {
    ...Text.defaultProps,
    numberOfLines: 1,
    allowFontScaling: false,
  };

  static contextType = TintColorContext;

  render() {
    let {style, text, children, ...others} = this.props;
    
    const contextTintColor = this.context ? this.context.tintColor : undefined;
    const colorStyle = contextTintColor !== null && contextTintColor !== undefined 
      ? {color: contextTintColor} 
      : {};

    style = [{
      flex: 1,
      paddingLeft: 4,
      paddingRight: 4,
      textAlign: 'center',
      overflow: 'hidden',
      fontSize: Theme.navTitleFontSize,
    }].concat(colorStyle).concat(style);

    return (
      <Text style={style} {...others}>
        {(text === null || text === undefined) ? children : text}
      </Text>
    );
  }

}

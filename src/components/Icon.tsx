import React from 'react';
import * as FeatherIcons from 'react-feather';

type IconName = keyof typeof FeatherIcons;

interface IconProps extends React.SVGAttributes<SVGElement> {
  name: IconName;
  size?: number;
  className?: string;
}

const Icon: React.FC<IconProps> = ({ name, size = 24, className, ...props }) => {
  const IconComponent = FeatherIcons[name] as React.ComponentType<any>;
  if (!IconComponent) {
    return <span>Icon not found</span>;
  }
  return <IconComponent size={size} className={className} {...props} />;
};

export default Icon;

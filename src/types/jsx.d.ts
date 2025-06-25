import { JSX as PreactJSX } from 'preact';

declare global {
  namespace JSX {
    type Element = PreactJSX.Element;
    type ElementClass = PreactJSX.ElementClass;
    type ElementAttributesProperty = PreactJSX.ElementAttributesProperty;
    type ElementChildrenAttribute = PreactJSX.ElementChildrenAttribute;
    type LibraryManagedAttributes<C, P> = PreactJSX.LibraryManagedAttributes<C, P>;
    type IntrinsicAttributes = PreactJSX.IntrinsicAttributes;
    type IntrinsicElements = PreactJSX.IntrinsicElements;
  }
} 
import { Generic } from '@agent/workflows/abilities/components/run/Generic';
import { CreateProduct } from '@agent/workflows/abilities/components/run/woo/CreateProduct';
import { createElement } from '@wordpress/element';

const BY_ABILITY = {
	'woocommerce/product-create': CreateProduct,
};

export const hasRunComponent = (abilityName) => !!BY_ABILITY[abilityName];

export const AbilityRun = (props) =>
	createElement(BY_ABILITY[props.id] ?? Generic, props);

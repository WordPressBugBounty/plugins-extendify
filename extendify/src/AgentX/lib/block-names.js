import { _x, sprintf } from '@wordpress/i18n';

// Block titles only exist in English on the site, so the parts the agent names carry their own.
const NAMES = {
	'core/paragraph': () => [
		// translators: The name of a part of the user's web page, a paragraph of text. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Paragraph', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over a paragraph of text on the user's website.
		_x('Edit paragraph', 'part menu option', 'extendify-local'),
	],
	'core/heading': () => [
		// translators: The name of a part of the user's web page, a heading. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Heading', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over a heading on the user's website.
		_x('Edit heading', 'part menu option', 'extendify-local'),
	],
	'core/image': () => [
		// translators: The name of a part of the user's web page, an image. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Image', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over an image on the user's website.
		_x('Edit image', 'part menu option', 'extendify-local'),
	],
	'core/cover': () => [
		// translators: The name of a part of the user's web page, a section with a picture or color behind its text. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Cover', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over a section with a picture or color behind its text on the user's website.
		_x('Edit cover', 'part menu option', 'extendify-local'),
	],
	'core/media-text': () => [
		// translators: The name of a part of the user's web page, a picture or video beside text. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Media and text', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over a picture or video beside text on the user's website.
		_x('Edit media and text', 'part menu option', 'extendify-local'),
	],
	'core/buttons': () => [
		// translators: The name of a part of the user's web page, a row of buttons. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Buttons', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over a row of buttons on the user's website.
		_x('Edit buttons', 'part menu option', 'extendify-local'),
	],
	'core/button': () => [
		// translators: The name of a part of the user's web page, a button. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Button', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over a button on the user's website.
		_x('Edit button', 'part menu option', 'extendify-local'),
	],
	'core/group': () => [
		// translators: The name of a part of the user's web page, a group of parts, like a section or a card. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Group', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over a group of parts, like a section or a card on the user's website.
		_x('Edit group', 'part menu option', 'extendify-local'),
	],
	'core/columns': () => [
		// translators: The name of a part of the user's web page, a row of columns. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Columns', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over a row of columns on the user's website.
		_x('Edit columns', 'part menu option', 'extendify-local'),
	],
	'core/column': () => [
		// translators: The name of a part of the user's web page, one column in a row of columns. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Column', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over one column in a row of columns on the user's website.
		_x('Edit column', 'part menu option', 'extendify-local'),
	],
	'core/list': () => [
		// translators: The name of a part of the user's web page, a list. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('List', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over a list on the user's website.
		_x('Edit list', 'part menu option', 'extendify-local'),
	],
	'core/list-item': () => [
		// translators: The name of a part of the user's web page, one item in a list. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('List item', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over one item in a list on the user's website.
		_x('Edit list item', 'part menu option', 'extendify-local'),
	],
	'core/quote': () => [
		// translators: The name of a part of the user's web page, a quote. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Quote', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over a quote on the user's website.
		_x('Edit quote', 'part menu option', 'extendify-local'),
	],
	'core/pullquote': () => [
		// translators: The name of a part of the user's web page, a large quote set apart from the text. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Pull quote', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over a large quote set apart from the text on the user's website.
		_x('Edit pull quote', 'part menu option', 'extendify-local'),
	],
	'core/separator': () => [
		// translators: The name of a part of the user's web page, a line that separates parts of the page. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Separator', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over a line that separates parts of the page on the user's website.
		_x('Edit separator', 'part menu option', 'extendify-local'),
	],
	'core/spacer': () => [
		// translators: The name of a part of the user's web page, empty space between parts of the page. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Spacer', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over empty space between parts of the page on the user's website.
		_x('Edit spacer', 'part menu option', 'extendify-local'),
	],
	'core/gallery': () => [
		// translators: The name of a part of the user's web page, a gallery of pictures. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Gallery', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over a gallery of pictures on the user's website.
		_x('Edit gallery', 'part menu option', 'extendify-local'),
	],
	'core/navigation': () => [
		// translators: The name of a part of the user's web page, the menu of links to the site's pages. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Menu', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over the menu of links to the site's pages on the user's website.
		_x('Edit menu', 'part menu option', 'extendify-local'),
	],
	'core/navigation-link': () => [
		// translators: The name of a part of the user's web page, one link in the menu. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Menu link', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over one link in the menu on the user's website.
		_x('Edit menu link', 'part menu option', 'extendify-local'),
	],
	'core/navigation-submenu': () => [
		// translators: The name of a part of the user's web page, a link in the menu that opens more links. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Menu link', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over a link in the menu that opens more links on the user's website.
		_x('Edit menu link', 'part menu option', 'extendify-local'),
	],
	'core/site-logo': () => [
		// translators: The name of a part of the user's web page, the site's logo. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Site logo', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over the site's logo on the user's website.
		_x('Edit site logo', 'part menu option', 'extendify-local'),
	],
	'core/site-title': () => [
		// translators: The name of a part of the user's web page, the site's title. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Site title', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over the site's title on the user's website.
		_x('Edit site title', 'part menu option', 'extendify-local'),
	],
	'core/site-tagline': () => [
		// translators: The name of a part of the user's web page, the site's tagline. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Site tagline', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over the site's tagline on the user's website.
		_x('Edit site tagline', 'part menu option', 'extendify-local'),
	],
	'core/social-links': () => [
		// translators: The name of a part of the user's web page, a row of icons linking to social media profiles. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Social icons', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over a row of icons linking to social media profiles on the user's website.
		_x('Edit social icons', 'part menu option', 'extendify-local'),
	],
	'core/social-link': () => [
		// translators: The name of a part of the user's web page, one icon linking to a social media profile. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Social icon', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over one icon linking to a social media profile on the user's website.
		_x('Edit social icon', 'part menu option', 'extendify-local'),
	],
	'core/details': () => [
		// translators: The name of a part of the user's web page, a question or title that opens to show more text. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Details', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over a question or title that opens to show more text on the user's website.
		_x('Edit details', 'part menu option', 'extendify-local'),
	],
	'core/table': () => [
		// translators: The name of a part of the user's web page, a table. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Table', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over a table on the user's website.
		_x('Edit table', 'part menu option', 'extendify-local'),
	],
	'core/video': () => [
		// translators: The name of a part of the user's web page, a video. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Video', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over a video on the user's website.
		_x('Edit video', 'part menu option', 'extendify-local'),
	],
	'core/embed': () => [
		// translators: The name of a part of the user's web page, content shown from another website, like a video. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Embed', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over content shown from another website, like a video on the user's website.
		_x('Edit embed', 'part menu option', 'extendify-local'),
	],
	'core/html': () => [
		// translators: The name of a part of the user's web page, a part made of custom HTML code. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Custom HTML', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over a part made of custom HTML code on the user's website.
		_x('Edit custom HTML', 'part menu option', 'extendify-local'),
	],
	'core/shortcode': () => [
		// translators: The name of a part of the user's web page, a part made by a shortcode. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Shortcode', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over a part made by a shortcode on the user's website.
		_x('Edit shortcode', 'part menu option', 'extendify-local'),
	],
	'core/page-list': () => [
		// translators: The name of a part of the user's web page, a list of the site's pages. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Page list', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over a list of the site's pages on the user's website.
		_x('Edit page list', 'part menu option', 'extendify-local'),
	],
	'core/post-title': () => [
		// translators: The name of a part of the user's web page, the title of a page or post. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Title', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over the title of a page or post on the user's website.
		_x('Edit title', 'part menu option', 'extendify-local'),
	],
	'core/post-featured-image': () => [
		// translators: The name of a part of the user's web page, the main picture of a page or post. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Featured image', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over the main picture of a page or post on the user's website.
		_x('Edit featured image', 'part menu option', 'extendify-local'),
	],
	'core/post-excerpt': () => [
		// translators: The name of a part of the user's web page, a short summary of a post. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Excerpt', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over a short summary of a post on the user's website.
		_x('Edit excerpt', 'part menu option', 'extendify-local'),
	],
	'core/post-date': () => [
		// translators: The name of a part of the user's web page, the date of a post. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Date', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over the date of a post on the user's website.
		_x('Edit date', 'part menu option', 'extendify-local'),
	],
	'core/query': () => [
		// translators: The name of a part of the user's web page, a list of blog posts. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Post list', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over a list of blog posts on the user's website.
		_x('Edit post list', 'part menu option', 'extendify-local'),
	],
	'core/search': () => [
		// translators: The name of a part of the user's web page, a search box. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Search', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over a search box on the user's website.
		_x('Edit search', 'part menu option', 'extendify-local'),
	],
	'core/file': () => [
		// translators: The name of a part of the user's web page, a link to download a file. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('File', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over a link to download a file on the user's website.
		_x('Edit file', 'part menu option', 'extendify-local'),
	],
	'core/accordion': () => [
		// translators: The name of a part of the user's web page, a list of questions or titles that each open to show more. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Accordion', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over a list of questions or titles that each open to show more on the user's website.
		_x('Edit accordion', 'part menu option', 'extendify-local'),
	],
	'core/accordion-item': () => [
		// translators: The name of a part of the user's web page, one question or title in an accordion, with its answer. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Accordion item', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over one question or title in an accordion, with its answer on the user's website.
		_x('Edit accordion item', 'part menu option', 'extendify-local'),
	],
	'core/accordion-heading': () => [
		// translators: The name of a part of the user's web page, the question or title of one accordion item. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Accordion heading', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over the question or title of one accordion item on the user's website.
		_x('Edit accordion heading', 'part menu option', 'extendify-local'),
	],
	'core/accordion-panel': () => [
		// translators: The name of a part of the user's web page, the answer that opens under one accordion item. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Accordion panel', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over the answer that opens under one accordion item on the user's website.
		_x('Edit accordion panel', 'part menu option', 'extendify-local'),
	],
	'woocommerce/product-price': () => [
		// translators: The name of a part of the user's web page, a product's price. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Product price', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over a product's price on the user's website.
		_x('Edit product price', 'part menu option', 'extendify-local'),
	],
	'woocommerce/product-image': () => [
		// translators: The name of a part of the user's web page, a product's picture. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Product image', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over a product's picture on the user's website.
		_x('Edit product image', 'part menu option', 'extendify-local'),
	],
	'woocommerce/product-button': () => [
		// translators: The name of a part of the user's web page, a product's button that adds it to the cart. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Add to cart button', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over a product's button that adds it to the cart on the user's website.
		_x('Edit add to cart button', 'part menu option', 'extendify-local'),
	],
	'woocommerce/product-rating': () => [
		// translators: The name of a part of the user's web page, a product's star rating. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Product rating', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over a product's star rating on the user's website.
		_x('Edit product rating', 'part menu option', 'extendify-local'),
	],
	'woocommerce/product-sale-badge': () => [
		// translators: The name of a part of the user's web page, the badge that marks a product on sale. Shown alone on the chip for the part they picked, and in their list of changes.
		_x('Sale badge', 'block name', 'extendify-local'),
		// translators: An option in the small menu that follows the pointer over the badge that marks a product on sale on the user's website.
		_x('Edit sale badge', 'part menu option', 'extendify-local'),
	],
};

// translators: The name of a part of the user's web page that the AI Agent has no name for, like one a plugin added.
const custom = () => _x('Custom block', 'block name', 'extendify-local');

// Any other block the site registered keeps WordPress's own title, already in the site's language.
const wordpressTitle = (type) => window.extAgentXData?.blockTitles?.[type];

export const blockName = (type) =>
	NAMES[type]?.()[0] ?? wordpressTitle(type) ?? custom();

export const editOption = (type) => {
	const own = NAMES[type]?.()[1];
	if (own) return own;
	const title = wordpressTitle(type);
	return title
		? sprintf(
				// translators: %s is the name WordPress gives a part of the user's web page, like Slider, in the site's language. An option in the small menu that follows the pointer over that part.
				_x('Edit %s', 'part menu option', 'extendify-local'),
				title,
			)
		: // translators: An option in the small menu that follows the pointer over a part of the user's website the AI Agent has no name for.
			_x('Edit block', 'part menu option', 'extendify-local');
};

// The agent reads labels in English, so it gets the name from the block type, untranslated.
export const englishName = (type) => {
	const name = type.split('/').pop().replaceAll('-', ' ');
	return name.charAt(0).toUpperCase() + name.slice(1);
};

// A brand, like a social network's name, reads the same in every language.
export const brandName = (slug) => {
	const name = slug.replaceAll('-', ' ');
	return name.charAt(0).toUpperCase() + name.slice(1);
};

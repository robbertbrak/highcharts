import H from '../parts/Globals.js';
var each = H.each,
	extend = H.extend,
	isArray = H.isArray,
	isBoolean = function (x) {
		return typeof x === 'boolean';
	},
	isFn = function (x) {
		return typeof x === 'function';
	},
	isObject = H.isObject,
	isNumber = H.isNumber,
	merge = H.merge,
	pick = H.pick,
	reduce = H.reduce;
// TODO Combine buildTree and buildNode with setTreeValues
// TODO Remove logic from Treemap and make it utilize this mixin.
var setTreeValues = function setTreeValues(tree, options) {
	var before = options.before,
		idRoot = options.idRoot,
		mapIdToNode = options.mapIdToNode,
		nodeRoot = mapIdToNode[idRoot],
		levelIsConstant = (
			isBoolean(options.levelIsConstant) ?
			options.levelIsConstant :
			true
		),
		points = options.points,
		point = points[tree.i],
		optionsPoint = point && point.options || {},
		childrenTotal = 0,
		children = [],
		value;
	extend(tree, {
		levelDynamic: tree.level - (levelIsConstant ? 0 : nodeRoot.level),
		name: pick(point && point.name, ''),
		visible: (
			idRoot === tree.id ||
			(isBoolean(options.visible) ? options.visible : false)
		)
	});
	if (isFn(before)) {
		tree = before(tree, options);
	}
	// First give the children some values
	each(tree.children, function (child, i) {
		var newOptions = extend({}, options);
		extend(newOptions, {
			index: i,
			siblings: tree.children.length,
			visible: tree.visible
		});
		child = setTreeValues(child, newOptions);
		children.push(child);
		if (child.visible) {
			childrenTotal += child.val;
		}
	});
	tree.visible = childrenTotal > 0 || tree.visible;
	// Set the values
	value = pick(optionsPoint.value, childrenTotal);
	extend(tree, {
		children: children,
		childrenTotal: childrenTotal,
		isLeaf: tree.visible && !childrenTotal,
		val: value
	});
	return tree;
};

var getColor = function getColor(node, options) {
	var index = options.index,
		levelMap = options.levelMap,
		parentColor = options.parentColor,
		parentColorIndex = options.parentColorIndex,
		series = options.series,
		colors = options.colors,
		siblings = options.siblings,
		points = series.points,
		getColorByPoint,
		point,
		level,
		colorByPoint,
		colorIndexByPoint,
		color,
		colorIndex;
	function variation(color) {
		var colorVariation = level && level.colorVariation;
		if (colorVariation) {
			if (colorVariation.key === 'brightness') {
				return H.color(color).brighten(
					colorVariation.to * (index / siblings)
				).get();
			}
		}

		return color;
	}

	if (node) {
		point = points[node.i];
		level = levelMap[node.levelDynamic] || {};
		getColorByPoint = (
			point &&
			(
				isBoolean(level.colorByPoint) ?
				level.colorByPoint :
				!!series.options.colorByPoint
			)
		);

		if (getColorByPoint) {
			colorIndexByPoint = point.index %
				(colors ? colors.length : series.chart.options.chart.colorCount);
			colorByPoint = colors && colors[colorIndexByPoint];
		}

		/*= if (build.classic) { =*/
		// Select either point color, level color or inherited color.
		color = pick(
			point && point.options.color,
			level && level.color,
			colorByPoint,
			parentColor && variation(parentColor),
			series.color
		);
		/*= } =*/
		colorIndex = pick(
			point && point.options.colorIndex,
			level && level.colorIndex,
			colorIndexByPoint,
			parentColorIndex,
			options.colorIndex
		);
	}
	return {
		color: color,
		colorIndex: colorIndex
	};
};

/**
 * getLevelOptions - Creates a map from level number to its given options.
 * @param {Object} params Object containing parameters.
 * @param {Object} params.defaults Object containing default options. The
 * default options are merged with the userOptions to get the final options for
 * a specific level.
 * @param {Number} params.levelRoot Which level on the tree where the root node
 * is located.
 * @param {Array} params.levels User options from series.levels.
 * @param {Number} params.height Height of tree.
 * @return {null|Object} Returns a map from level number to its given options.
 * Returns null if invalid input parameters.
 */
var getLevelOptions = function getLevelOptions(params) {
	var result = null,
		defaults,
		converted,
		height,
		i,
		levelRoot,
		levels;
	if (isObject(params)) {
		result = {};
		levels = params.levels;
		levelRoot = isNumber(params.levelRoot) ? params.levelRoot : 0;
		height = isNumber(params.height) ? params.height : 0;
		if (isArray(levels)) {
			defaults = isObject(params.defaults) ? params.defaults : {};
			converted = reduce(levels, function (obj, item) {
				var level,
					levelIsConstant,
					options;
				if (isObject(item) && isNumber(item.level)) {
					options = merge({}, defaults, item);
					levelIsConstant = options.levelIsConstant;
					// Delete redundant properties.
					delete options.levelIsConstant;
					delete options.level;
					// Calculate which level these options apply to.
					level = item.level + (levelIsConstant ? 0 : levelRoot);
					if (isObject(obj[level])) {
						extend(obj[level], options);
					} else {
						obj[level] = options;
					}
				}
				return obj;
			}, {});
		}
		/**
		 * Only return options for level 1 and up to height of the tree.
		 * Add default options for missing levels.
		 */
		i = levelRoot > 0 ? levelRoot : 1;
		for (; i <= height; i++) {
			if (isObject(converted[i])) {
				result[i] = converted[i];
			} else {
				result[i] = merge({}, defaults);
			}
		}
	}
	return result;
};

var result = {
	getColor: getColor,
	getLevelOptions: getLevelOptions,
	setTreeValues: setTreeValues
};
export default result;

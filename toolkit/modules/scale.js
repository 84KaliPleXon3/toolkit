 /* toolkit provides different widgets, implements and modules for 
 * building audio based applications in webbrowsers.
 * 
 * Invented 2013 by Markus Schmidt <schmidt@boomshop.net>
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General
 * Public License along with this program; if not, write to the
 * Free Software Foundation, Inc., 51 Franklin Street, Fifth Floor, 
 * Boston, MA  02110-1301  USA
 */
"use strict";
(function(w) { 
function vert(O) {
    return O.layout == "left" || O.layout == "right";
}
function fill_interval(range, levels, i, from, to, min_gap, result) {
    var level = levels[i];
    var x, j, pos, last_pos, last;
    var diff;

    var to_pos = range.val2px(to);
    last_pos = range.val2px(from);

    if (Math.abs(to_pos - last_pos) < min_gap) return;

    if (!result) result = {
        values: [],
        positions: [],
    };

    var values = result.values;
    var positions = result.positions;

    if (from > to) level = -level;
    last = from;

    for (j = ((to-from)/level)|0, x = from + level; j > 0; x += level, j--) {
        pos = range.val2px(x);
        diff = Math.abs(last_pos - pos);
        if (Math.abs(to_pos - pos) < min_gap) break;
        if (diff >= min_gap) {
            if (i > 0 && diff >= min_gap * 2) {
                // we have a chance to fit some more labels in
                fill_interval(range, levels, i-1,
                              last, x, min_gap, result);
            }
            values.push(x);
            positions.push(pos);
            last_pos = pos;
            last = x;
        }
    }

    if (i > 0 && Math.abs(last_pos - to_pos) >= min_gap * 2) {
        fill_interval(range, levels, i-1, last, to, min_gap, result);
    }

    return result;
}
// remove collisions from a with b given a minimum gap
function remove_collisions(a, b, min_gap, vert) {
    var pa = a.positions, pb = b.positions;
    var va = a.values;
    var dim;

    min_gap = +min_gap;

    if (typeof vert === "boolean")
        dim = vert ? b.height : b.width;

    if (!(min_gap > 0)) min_gap = 1;

    if (!pb.length) return a;

    var i, j;
    var values = [];
    var positions = [];
    var pos_a, pos_b;
    var size;

    var last_pos = +pb[0],
        last_size = min_gap;

    if (dim) last_size += +dim[0] / 2;

    // If pb is just length 1, it does not matter
    var direction = pb.length > 1 && pb[1] < last_pos ? -1 : 1;

    for (i = 0, j = 0; i < pa.length && j < pb.length;) {
        pos_a = +pa[i];
        pos_b = +pb[j];
        size = min_gap;

        if (dim) size += dim[j] / 2;

        if (Math.abs(pos_a - last_pos) < last_size ||
            Math.abs(pos_a - pos_b) < size) {
            // try next position
            i++;
            continue;
        }

        if (j < pb.length - 1 && (pos_a - pos_b)*direction > 0) {
            // we left the current interval, lets try the next one
            last_pos = pos_b;
            last_size = size;
            j++;
            continue;
        }

        values.push(+va[i]);
        positions.push(pos_a);

        i++;
    }

    return {
        values: values,
        positions: positions,
    };
}
function create_dom_nodes(data, create) {
    var nodes = [];
    var values, positions;
    var i;
    var E = this.element;
    var node;

    data.nodes = nodes;
    values = data.values;
    positions = data.positions;

    for (i = 0; i < values.length; i++) {
        nodes.push(node = create(values[i], positions[i]));
        E.appendChild(node);
    }
}
function position_element(O, elem, position) {
    if (O.layout == "left" || O.layout == "right") {
        elem.style.bottom = position.toFixed(1) + "px";
        elem.style.transform = "translateY(50%)";
    } else {
        elem.style.left = position.toFixed(1) + "px";
        elem.style.transform = "translateX(-50%)";
    }
}
function create_label(value, position) {
    var O = this.options;
    var elem = document.createElement("SPAN");
    elem.className = "toolkit-label";
    elem.style.position = "absolute";
    elem.style.cssFloat = "left";
    elem.style.display = "block";

    position_element(O, elem, position);

    TK.set_content(elem, O.labels(value));

    if (O.base === value)
        TK.add_class(elem, "toolkit-base");
    else if (O.max === value)
        TK.add_class(elem, "toolkit-max");
    else if (O.min === value)
        TK.add_class(elem, "toolkit-min");

    return elem;
}
function create_dot(value, position) {
    var O = this.options;
    var elem = document.createElement("DIV");
    elem.className = "toolkit-dot";
    elem.style.position = "absolute";

    position_element(O, elem, position);

    return elem;
}
function measure_dimensions(data) {
    var nodes = data.nodes;
    var width = [];
    var height = [];

    for (var i = 0; i < nodes.length; i++) {
        width.push(TK.outer_width(nodes[i]));
        height.push(TK.outer_height(nodes[i]));
    }

    data.width = width;
    data.height = height;
}
function generate_scale(from, to, include_from, show_to) {
    var O = this.options;
    var labels;

    if (O.show_labels || O.show_markers)
        labels = {
            values: [],
            positions: [],
        };

    var dots = {
        values: [],
        positions: [],
    };
    var is_vert = vert(O);
    var tmp;

    if (include_from) {
        tmp = this.val2px(from);

        if (labels) {
            labels.values.push(from);
            labels.positions.push(tmp);
        }

        dots.values.push(from);
        dots.positions.push(tmp);
    }

    var levels = O.levels;

    fill_interval(this, levels, levels.length - 1, from, to, O.gap_dots, dots);

    if (labels) {
        if (O.levels_labels) levels = O.levels_labels;

        fill_interval(this, levels, levels.length - 1, from, to, O.gap_labels, labels);

        tmp = this.val2px(to);

        if (show_to || Math.abs(tmp - this.val2px(from)) >= O.gap_labels) {
            labels.values.push(to);
            labels.positions.push(tmp);

            dots.values.push(to);
            dots.positions.push(tmp);
        }
    } else {
        dots.values.push(to);
        dots.positions.push(this.val2px(to));
    }

    if (O.show_labels) {
        create_dom_nodes.call(this, labels, create_label.bind(this));

        if (labels.values.length && labels.values[0] == O.base) {
            TK.add_class(labels.nodes[0], "toolkit-base");
        }
    }

    var render_cb = function() {
        var markers;

        if (O.show_markers) {
            markers = {
                values: labels.values,
                positions: labels.positions,
            };
            create_dom_nodes.call(this, markers, create_dot.bind(this));
            for (var i = 0; i < markers.nodes.length; i++)
                TK.add_class(markers.nodes[i], "toolkit-marker");
        }

        if (O.show_labels && labels.values.length > 1) {
            // we move the last element by half its size
            var last = labels.values.length-1;
            var size = is_vert ? labels.height[last] : labels.width[last];

            if (this.val2px(from) < labels.positions[last]) size = -size;

            labels.positions[last] += size / 2;

            position_element(O, labels.nodes[last], labels.positions[last]);

            if (labels.values[last] == O.min) {
                TK.add_class(labels.nodes[last], "toolkit-min");
            } else if (labels.values[last] == O.max) {
                TK.add_class(labels.nodes[last], "toolkit-max");
            }
        }

        if (O.avoid_collisions && O.show_labels) {
            dots = remove_collisions(dots, labels, O.gap_dots, is_vert);
        } else if (markers) {
            dots = remove_collisions(dots, markers, O.gap_dots);
        }

        create_dom_nodes.call(this, dots, create_dot.bind(this));

        if (O.auto_size && O.show_labels) auto_size.call(this, labels);
    };

    if (O.show_labels)
        TK.S.add(function() {
            measure_dimensions(labels);
            TK.S.add(render_cb.bind(this), 1);
        }.bind(this));
    else render_cb.call(this);
}
function auto_size(labels) {
    var size_fun;
    var new_size;

    if (!labels.width.length) return;

    if (vert(this.options)) {
        size_fun = TK.outer_width;
        new_size = Math.max.apply(Math, labels.width);
    } else {
        size_fun = TK.outer_height;
        new_size = Math.max.apply(Math, labels.height);
    }

    TK.S.add(function() {
        if (new_size > size_fun(this.element))
            TK.S.add(size_fun.bind(this, this.element, true, new_size), 1);
    }.bind(this));
}
/**
 * TK.Scale can be used to draw scales. It is used in {@link TK.MeterBase} and
 * {@link TK.Fader}. TK.Scale draws labels and markers based on its parameters
 * and the available space. Scales can be drawn both vertically and horizontally.
 * Scale mixes in {@link TK.Ranged} and inherits all its options.
 *
 * @extends TK.Widget
 * @mixes TK.Ranged
 * @class TK.Scale
 *
 * @param {Object} options
 * @property {string} [options.layout="right"] - The layout of the Scale. <code>"right"</code> and
 *      <code>"left"</code> are vertical layouts with the labels being drawn right and left of the scale,
 *      respectively. <code>"top"</code> and <code>"bottom"</code> are horizontal layouts for which the 
 *      labels are drawn on top and below the scale, respectively.
 * @property {int} [options.division=1] - Minimal step size of the markers.
 * @property {Array} [options.levels=[1]] - Array of steps for labels and markers.
 * @property {number} [options.base=false]] - Base of the scale. If set to <code>false</code> it will
 *      default to the minimum value.
 * @property {function} [options.labels=TK.FORMAT("%.2f")] - Formatting function for the scale labels.
 * @property {int} [options.gap_dots=4] - Minimum gap in pixels between two adjacent markers.
 * @property {int} [options.gap_labels=40] - Minimum gap in pixels between two adjacent labels.
 * @property {boolean} [options.show_labels=true] - If <code>true</code>, labels are drawn.
 * @property {boolean} [options.show_max=true] - If <code>true</code>, display a label and a
 *  dot for the 'max' value.
 * @property {boolean} [options.show_min=true] - If <code>true</code>, display a label and a
 *  dot for the 'min' value.
 * @property {boolean} [options.show_base=true] - If <code>true</code>, display a label and a
 *  dot for the 'base' value.
 * @property {Array} [options.fixed_dots] - This option can be used to specify fixed positions
 *      for the markers to be drawn at.
 * @property {Array} [options.fixed_labels] - This option can be used to specify fixed positions
 *      for the labels to be drawn at.
 */
w.TK.Scale = w.Scale = $class({
    _class: "Scale",
    
    Extends: TK.Widget,
    Implements: [Ranged],
    _options: Object.assign(Object.create(TK.Widget.prototype._options), Ranged.prototype._options, {
        layout: "string",
        division: "number",
        levels: "array",
        levels_labels: "array",
        base: "number",
        labels: "function",
        gap_dots: "number",
        gap_labels: "number",
        show_labels: "boolean",
        show_min: "boolean",
        show_max: "boolean",
        show_base: "boolean",
        fixed_dots: "array",
        fixed_labels: "array",
        auto_size: "boolean",
        avoid_collisions: "boolean",
        show_markers: "boolean",
    }),
    options: {
        layout:           "right",
        division:         1,
        levels:           [1],
        base:             false,
        labels:           TK.FORMAT("%.2f"),
        avoid_collisions: true,
        gap_dots:         4,
        gap_labels:       40,
        show_labels:      true,
        show_min:         true,
        show_max:         true,
        show_base:        true,
        show_markers:     true,
        fixed_dots:       false,
        fixed_labels:     false,
        auto_size:        false           // the overall size can be set automatically
                                          // according to labels width/height
    },
    
    initialize: function (options) {
        var E;
        TK.Widget.prototype.initialize.call(this, options);
        if (!(E = this.element)) this.element = E = TK.element("div");
        TK.add_class(E, "toolkit-scale");
        this.element = this.widgetize(E, true, true, true);
    },

    initialized: function() {
        TK.Widget.prototype.initialized.call(this);
        Ranged.prototype.initialized.call(this);
    },
    
    redraw: function () {
        TK.Widget.prototype.redraw.call(this);

        var I = this.invalid;
        var O = this.options;
        var E = this.element;

        if (I.layout) {
            I.layout = false;
            TK.remove_class(E, "toolkit-vertical");
            TK.remove_class(E, "toolkit-horizontal");
            TK.remove_class(E, "toolkit-top");
            TK.remove_class(E, "toolkit-bottom");
            TK.remove_class(E, "toolkit-right");
            TK.remove_class(E, "toolkit-left");
            switch (O.layout) {
            case "left":
                TK.add_class(E, "toolkit-vertical");
                TK.add_class(E, "toolkit-left");
                break;
            case "right":
                TK.add_class(E, "toolkit-vertical");
                TK.add_class(E, "toolkit-right");
                break;
            case "top":
                TK.add_class(E, "toolkit-horizontal");
                TK.add_class(E, "toolkit-top");
                break;
            case "bottom":
                TK.add_class(E, "toolkit-horizontal");
                TK.add_class(E, "toolkit-bottom");
                break;
            default:
                TK.warn("Unsupported layout setting:", O.layout);
            }
        }

        if (I.auto_size) {
            I.auto_size = false;
            if (O.auto_size) {
                I.basis = true;
            } else {
                this.element.style.removeProperty(vert(O) ? "height" : "width"); 
            }
        }

        if (I.basis || I.auto_size) {
            I.auto_size = false;
            if (O.auto_size) {
                if (vert(O)) this.element.style.height = O.basis + "px";
                else this.element.style.width = O.basis + "px";
            }
        }

        if (I.validate("base", "show_base", "gap_labels", "min", "show_min", "division", "max",
                       "fixed_dots", "fixed_labels", "levels", "basis", "scale", "reverse", "show_labels")) {
            if (O.base === false)
                O.base = O.max
            TK.empty(this.element);

            var labels = [];

            if (O.fixed_dots && O.fixed_labels) {
                if (O.show_labels) {
                    var labels = {
                        values: O.fixed_labels,
                        positions: O.fixed_labels.map(this.val2px, this),
                    };
                    create_dom_nodes.call(this, labels, create_label.bind(this));
                    if (O.auto_size) {
                        TK.S.add(function() {
                            measure_dimensions(labels);
                            TK.S.add(auto_size.bind(this, labels), 1);
                        }.bind(this));
                    }
                }
                var dots = {
                    values: O.fixed_dots,
                    positions: O.fixed_dots.map(this.val2px, this),
                };
                create_dom_nodes.call(this, dots, create_dot.bind(this));
            } else {
                if (O.base != O.max) generate_scale.call(this, O.base, O.max, true, O.show_max);
                if (O.base != O.min) generate_scale.call(this, O.base, O.min, false, O.show_min);
            }
        }
    },
    
    // GETTER & SETTER
    set: function (key, value) {
        TK.Widget.prototype.set.call(this, key, value);
        switch (key) {
            case "division":
            case "levels":
            case "labels":
            case "gap_dots":
            case "gap_labels":
            case "show_labels":
                this.fire_event("scalechanged")
                break;
            case "base":
                if (value === false) {
                    this.options.base = this.options.min;
                    this.__based = false;
                } else {
                    this.__based = true;
                }
                this.fire_event("basechanged", value);
                break;
        }
    }
});
})(this);

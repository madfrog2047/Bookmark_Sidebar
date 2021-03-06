($ => {
    "use strict";

    $.SidebarHelper = function (s) {

        /**
         * Initialises the behaviour settings
         *
         * @returns {Promise}
         */
        this.init = async () => {
            initEvents();
            initToggleAreaEvents();
            initToggleAreaFields();
            initFilter();

            ["dirAccordion", "animations", "contextmenu", "preventPageScroll", "reopenSidebar", "preventWindowed", "dndOpen", "tooltipAdditionalInfo"].forEach((field) => {
                if (s.helper.model.getData("b/" + field) === true) {
                    s.elm.checkbox[field].trigger("click");
                }
            });

            s.elm.select.language[0].value = s.helper.i18n.getLanguage();

            ["visibility", "openAction", "sidebarPosition", "linkAction", "rememberState", "newTab", "newTabPosition", "tooltipContent"].forEach((field) => { // select
                s.elm.select[field][0].value = s.helper.model.getData("b/" + field);
                s.elm.select[field].trigger("change");
            });

            ["openDelay", "dirOpenDuration", "openChildrenWarnLimit", "scrollBarHide", "closeTimeout", "tooltipDelay"].forEach((field) => { // range
                const val = s.helper.model.getData("b/" + field);

                if (val === -1) {
                    const checkbox = s.elm.range[field].data("infinityCheckbox");
                    if (checkbox && checkbox.length() > 0) {
                        checkbox.trigger("click");
                    }
                }

                s.elm.range[field][0].value = val;
                s.elm.range[field].trigger("change");
            });

            const path = s.helper.menu.getPath();
            if (path.length >= 2 && path[0] === "sidebar" && path[1] === "toggle" && path[2] === "area") { // initially open the modal for configuring the toggle area (will be called from the finish slide of the onboarding page)
                s.elm.buttons.toggleAreaOpen.trigger("click");
            }
        };

        /**
         * Save the behaviour settings and the user language
         *
         * @returns {Promise}
         */
        this.save = () => {
            return new Promise((resolve) => {
                const config = {
                    toggleArea: {},
                    blacklist: [],
                    whitelist: []
                };

                ["width", "height", "top", "widthWindowed"].forEach((field) => {
                    config.toggleArea[field] = s.elm.range["toggleArea_" + field][0].value;
                });

                ["visibility", "openAction", "sidebarPosition", "linkAction", "rememberState", "newTab", "newTabPosition", "tooltipContent"].forEach((field) => { // select
                    config[field] = s.elm.select[field][0].value;
                });

                ["openDelay", "dirOpenDuration", "openChildrenWarnLimit", "scrollBarHide", "closeTimeout", "tooltipDelay"].forEach((field) => { // range
                    let val = -1;

                    if (s.elm.range[field].hasClass($.cl.settings.inactive) === false) { // if inactive set -1 as value else use the selected value
                        val = s.elm.range[field][0].value;
                    }

                    config[field] = val;
                });

                ["dirAccordion", "animations", "contextmenu", "preventPageScroll", "reopenSidebar", "preventWindowed", "dndOpen", "tooltipAdditionalInfo"].forEach((field) => { // checkbox
                    config[field] = s.helper.checkbox.isChecked(s.elm.checkbox[field]);
                });

                if (config.visibility === "blacklist" || config.visibility === "whitelist") {
                    const rules = s.elm.textarea.visibilityFilter[0].value;
                    config[config.visibility] = rules.split(/\n+/);

                    if (config[config.visibility][0] === "") {
                        config.visibility = "always";
                    }
                }

                let lang = s.elm.select.language[0].value;
                if (lang === s.helper.i18n.getUILanguage()) {
                    lang = "default";
                }

                chrome.storage.sync.get(["language"], (obj) => {
                    chrome.storage.sync.set({
                        behaviour: config,
                        language: lang
                    }, () => {
                        if (!(obj && obj.language && obj.language === lang)) {
                            $.delay(1500).then(() => {
                                location.reload(true);
                            });
                        }
                        resolve();
                    });
                });
            });
        };

        /**
         * Initialises the filter to allow specified control over where to load the sidebar (or where not to)
         */
        const initFilter = () => {
            s.elm.textarea.visibilityFilter.attr("placeholder", "example.com/*\n*.example.com/*");

            s.elm.sidebar.filterExplanation.find("> ul > li").forEach((elm) => { // highlight [*] in the explanations
                const text = $(elm).text();
                $(elm).html(text.replace(/(?<!\/)\*/g, "<em>*</em>"));
            });

            s.elm.select.visibility.on("change", (e) => {
                const val = e.currentTarget.value;

                if (val === "always") { // always show sidebar -> don't show url rules
                    s.elm.sidebar.filterExplanation.addClass($.cl.hidden);
                    s.elm.sidebar.filterPatters.addClass($.cl.hidden);
                } else if (val === "blacklist" || val === "whitelist") { // show url rules
                    s.elm.sidebar.filterExplanation.removeClass($.cl.hidden);
                    s.elm.sidebar.filterPatters.removeClass($.cl.hidden);

                    if (s.elm.textarea.visibilityFilter[0].value.length === 0) { // fill with the already set rules, if the field is empty
                        const rules = s.helper.model.getData("b/" + val);
                        s.elm.textarea.visibilityFilter[0].value = rules.join("\n");
                    }
                }
            });
        };

        /**
         * Initialises the toggleArea sliders
         */
        const initToggleAreaFields = () => {
            const toggleArea = s.helper.model.getData("b/toggleArea");

            ["width", "height", "top", "widthWindowed"].forEach((field) => {
                s.elm.range["toggleArea_" + field][0].value = toggleArea[field];
                s.elm.range["toggleArea_" + field].trigger("change");
            });
        };

        /**
         * Initialises the eventhandlers for the toggleArea modal
         *
         * @returns {Promise}
         */
        const initToggleAreaEvents = async () => {
            const modal = s.elm.body.children("div." + $.cl.settings.toggleArea.modal);
            const preview = modal.children("div." + $.cl.settings.toggleArea.preview);

            $([s.elm.range.toggleArea_width, s.elm.range.toggleArea_height, s.elm.range.toggleArea_top]).on("change input", (e) => {
                const minWidth = 14;

                const val = {
                    width: +s.elm.range.toggleArea_width[0].value,
                    height: +s.elm.range.toggleArea_height[0].value,
                    top: +s.elm.range.toggleArea_top[0].value
                };

                if (val.height + val.top > 100) {
                    let topVal = null;

                    if (e.currentTarget === s.elm.range.toggleArea_height[0]) {
                        topVal = val.top - (val.height + val.top - 100);
                    } else if (e.currentTarget === s.elm.range.toggleArea_top[0]) {
                        topVal = 100 - val.height;
                    }

                    if (topVal !== null) {
                        s.elm.range.toggleArea_top[0].value = topVal;
                        s.elm.range.toggleArea_top.trigger("change");
                    }
                } else {
                    preview.css({
                        width: (minWidth + val.width) + "px",
                        height: (val.height) + "%",
                        top: val.top + "%"
                    });

                    if (val.height === 100) {
                        preview.addClass($.cl.settings.toggleArea.fullHeight);
                    } else {
                        preview.removeClass($.cl.settings.toggleArea.fullHeight);
                    }
                }
            });

            s.elm.buttons.toggleAreaOpen.on("click", (e) => { // open modal for advanced toggle options
                e.preventDefault();

                $.delay(100).then(() => {
                    modal.attr($.attr.type, s.elm.select.sidebarPosition[0].value);
                    s.elm.body.addClass($.cl.settings.showModal);
                });
            });

            s.elm.buttons.toggleAreaSave.on("click", (e) => { // save settings
                e.preventDefault();
                s.elm.buttons.save.trigger("click");
                s.elm.body.trigger("click");
            });

            s.elm.buttons.toggleAreaCancel.on("click", (e) => { // close modal
                e.preventDefault();
                s.elm.body.trigger("click");
                $.delay(500).then(() => {
                    initToggleAreaFields();
                });
            });

            s.elm.body.on("click", (e) => { // close modal when click something outside the overlay
                const _target = $(e.target);
                if (
                    !preview.hasClass($.cl.settings.toggleArea.dragging) &&
                    !_target.hasClass($.cl.settings.toggleArea.modal) &&
                    _target.parents("div." + $.cl.settings.toggleArea.modal).length() === 0
                ) {
                    s.elm.body.removeClass($.cl.settings.showModal);
                }
            });

            preview.on("mousedown", (e) => { // drag start
                preview.addClass([$.cl.settings.toggleArea.dragged, $.cl.settings.toggleArea.dragging]);
                preview.data("pos", {start: preview[0].offsetTop, y: e.pageY});
            });

            s.elm.body.on("mouseup", () => { // drag end
                $.delay(0).then(() => {
                    preview.removeClass($.cl.settings.toggleArea.dragging);
                });
            }).on("mousemove", (e) => { // drag move
                if (preview.hasClass($.cl.settings.toggleArea.dragging) && e.which === 1) {
                    const pos = preview.data("pos");
                    s.elm.range.toggleArea_top[0].value = ((pos.start + e.pageY - pos.y) / modal[0].offsetHeight) * 100;
                    s.elm.range.toggleArea_top.trigger("change");
                }
            }, {passive: true});
        };

        /**
         * Initialises the eventhandlers
         *
         * @returns {Promise}
         */
        const initEvents = async () => {
            s.elm.select.openAction.on("change", (e) => {
                const indicatorMenuPoint = s.elm.aside.find("li[" + $.attr.name + "='indicator']");

                // hide menupoint for changing the appearance of the indicator if it is not visible at all
                if (e.currentTarget.value === "contextmenu" || e.currentTarget.value === "mousedown") {
                    indicatorMenuPoint.removeClass($.cl.hidden);
                } else {
                    indicatorMenuPoint.addClass($.cl.hidden);
                }

                // hide "configure area" when user wants to open the sidebar by clicking the extension icon only
                const toggleAreaWrapper = s.elm.buttons.toggleAreaOpen.parent("div");

                if (e.currentTarget.value === "icon") {
                    toggleAreaWrapper.addClass($.cl.hidden);
                } else {
                    toggleAreaWrapper.removeClass($.cl.hidden);
                }
            });

            s.elm.buttons.keyboardShortcut.on("click", (e) => {
                e.preventDefault();
                chrome.tabs.create({
                    url: "chrome://extensions/shortcuts",
                    active: true
                });
            });
        };
    };

})(jsu);
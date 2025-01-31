/**
 * Toasty.js - A modern, vanilla JS replacement for Toastr.
 * 
 * Inspired by: https://github.com/Srirangan/notifer.js
 * Based on Toastr.js (https://github.com/CodeSeven/toastr)
 * 
 * Original Authors of Toastr: 
 * - John Papa, Hans Fjällemark, Tim Ferrell
 * - ARIA Support: Greta Krafsig
 * 
 * Rewritten & maintained by: [Your Name] (2024)
 * License: MIT (See LICENSE file)
 *
 * Usage Example:
 *
 *   // 1. Instantiate Toasty
 *   const toaster = new Toasty({ closeButton: true, progressBar: true });
 *
 *   // 2. Show notifications
 *   toaster.success("Operation successful!", "Success");
 *   toaster.error("Something went wrong!", "Error");
 *
 *   // 3. (Optional) Customize global defaults
 *   toaster.setOptions({
 *     timeOut: 4000,
 *     positionClass: 'toast-bottom-right'
 *   });
 *
 */

class Toasty {
    /**
     * Constructor: Accepts partial options to override defaults.
     *
     * @param {Object} userOptions - Partial configuration options.
     */
    constructor(userOptions = {}) {
        /**
         * @private
         * @type {HTMLElement|null}
         * The container where all toast elements will be appended.
         */
        this._container = null;

        /**
         * @private
         * @type {Function|null}
         * A subscriber callback for listening to all toast events.
         */
        this._listener = null;

        /**
         * @private
         * @type {number}
         * Incremental toast ID to ensure unique references.
         */
        this._toastId = 0;

        /**
         * @private
         * @type {string|undefined}
         * Tracks previous toast message to prevent duplicates if enabled.
         */
        this._previousMessage = undefined;

        /**
         * @private
         * @type {Object}
         * Internal merged options from defaults + user overrides.
         */
        this._options = Object.assign({}, this._getDefaults(), userOptions);
    }

    /**
     * Display an error toast notification.
     *
     * @param {string} message - The main text/body of the toast.
     * @param {string} [title] - Optional title text.
     * @param {Object} [optionsOverride] - Additional config overrides for this toast.
     * @returns {HTMLElement|null} The created toast element, or null on failure.
     */
    error(message, title, optionsOverride) {
        return this._notify({
            type: 'error',
            iconClass: this._options.iconClasses.error,
            message,
            title,
            optionsOverride,
        });
    }

    /**
     * Display an info toast notification.
     */
    info(message, title, optionsOverride) {
        return this._notify({
            type: 'info',
            iconClass: this._options.iconClasses.info,
            message,
            title,
            optionsOverride,
        });
    }

    /**
     * Display a success toast notification.
     */
    success(message, title, optionsOverride) {
        return this._notify({
            type: 'success',
            iconClass: this._options.iconClasses.success,
            message,
            title,
            optionsOverride,
        });
    }

    /**
     * Display a warning toast notification.
     */
    warning(message, title, optionsOverride) {
        return this._notify({
            type: 'warning',
            iconClass: this._options.iconClasses.warning,
            message,
            title,
            optionsOverride,
        });
    }

    /**
     * Clear (hide) a single toast or all toasts in the container.
     *
     * @param {HTMLElement} [toastElement] - Specific toast to clear; omit to clear all.
     * @param {Object} [clearOptions] - Allows forcing the toast to close if focused.
     */
    clear(toastElement, clearOptions = {}) {
        this._ensureContainerExists();
        if (toastElement) {
            this._clearToast(toastElement, this._options, clearOptions);
        } else {
            this._clearAllToasts();
        }
    }

    /**
     * Remove a single toast or the entire container if no element is provided.
     * This does not animate out the toast; it forcibly removes it from the DOM.
     *
     * @param {HTMLElement} [toastElement] - The toast to remove.
     */
    remove(toastElement) {
        this._ensureContainerExists();
        if (toastElement) {
            if (!toastElement.querySelector(':focus')) {
                this._removeToast(toastElement);
            }
        } else if (this._container && this._container.children.length) {
            this._container.remove();
            this._container = null;
        }
    }

    /**
     * Subscribe to toast creation/hide events.
     *
     * @param {Function} callback - Will be invoked with an event object
     *   containing details about each toast event.
     */
    subscribe(callback) {
        if (typeof callback === 'function') {
            this._listener = callback;
        }
    }

    /**
     * Override the current global Toasty options.
     *
     * @param {Object} newOptions
     */
    setOptions(newOptions = {}) {
        this._options = Object.assign({}, this._options, newOptions);
    }

    /**
     * Get the current Toasty options (merged defaults + user overrides).
     *
     * @returns {Object}
     */
    getOptions() {
        return Object.assign({}, this._options);
    }

    /* ---------------------------------------------- */
    /*                PRIVATE METHODS                 */
    /* ---------------------------------------------- */

    /**
     * Internal method to handle toast creation and display logic.
     *
     * @private
     * @param {Object} map - All relevant info (type, message, title, etc.).
     * @returns {HTMLElement|null} The created toast element, or null on exit.
     */
    _notify(map) {
        try {
            let options = this.getOptions();
            let iconClass = map.iconClass || options.iconClass;

            // Merge local overrides if provided
            if (map.optionsOverride) {
                options = Object.assign({}, options, map.optionsOverride);
                iconClass = map.optionsOverride.iconClass || iconClass;
            }

            // Respect "preventDuplicates" if enabled
            if (this._shouldExit(options, map)) {
                return null;
            }

            this._toastId += 1;
            this._ensureContainerExists();

            const toastEl = document.createElement('div');
            const titleEl = document.createElement('div');
            const messageEl = document.createElement('div');
            let closeEl = null;
            let progressEl = null;

            // For tracking the progress bar
            const progressBar = {
                intervalId: null,
                hideEta: null,
                maxHideTime: null,
            };

            // The event data we'll publish to any subscribers
            const response = {
                toastId: this._toastId,
                state: 'visible',
                startTime: new Date(),
                options,
                map,
            };

            // Compose the toast
            this._personalizeToast(
                toastEl,
                titleEl,
                messageEl,
                map,
                options,
                iconClass
            );

            if (options.closeButton) {
                closeEl = this._buildCloseButton(toastEl, options);
            }

            if (options.progressBar) {
                progressEl = this._buildProgressBar(toastEl, options);
            }

            this._setSequence(toastEl, options);
            this._setAria(toastEl, iconClass, options);

            // Animate/show the toast
            this._displayToast(toastEl, options, progressBar, response);

            // Attach event handlers (click, hover, close, etc.)
            this._handleEvents(
                toastEl,
                closeEl,
                options,
                progressBar,
                response
            );

            // Let the outside world know a toast was created
            this._publish(response);

            return toastEl;
        } catch (err) {
            console.error('[Toasty] Error creating toast:', err);
            return null;
        }
    }

    /**
     * Ensure the container DOM element exists, create it if not.
     *
     * @private
     */
    _ensureContainerExists() {
        if (!this._container) {
            const opts = this.getOptions();
            const existing = document.getElementById(opts.containerId);
            this._container = existing || this._createContainer(opts);
        }
    }

    /**
     * Create the container DOM element based on current options.
     *
     * @private
     * @param {Object} options
     * @returns {HTMLElement} The newly created container element.
     */
    _createContainer(options) {
        const containerEl = document.createElement('div');
        containerEl.setAttribute('id', options.containerId);
        containerEl.className = options.positionClass;

        const targetEl = document.querySelector(options.target);
        if (!targetEl) {
            throw new Error(
                `Toasty target selector "${options.target}" not found in the DOM.`
            );
        }
        targetEl.appendChild(containerEl);
        return containerEl;
    }

    /**
     * Construct the main portion of the toast (title, message, icon classes).
     *
     * @private
     */
    _personalizeToast(toastEl, titleEl, messageEl, map, options, iconClass) {
        // Base toast classes
        toastEl.className = `${options.toastClass} ${iconClass || ''}`;
        toastEl.style.opacity = '0'; // start hidden

        // Title
        if (map.title) {
            titleEl.className = options.titleClass;
            if (options.escapeHtml) {
                titleEl.textContent = map.title;
            } else {
                titleEl.innerHTML = map.title;
            }
            toastEl.appendChild(titleEl);
        }

        // Message
        if (map.message) {
            messageEl.className = options.messageClass;
            if (options.escapeHtml) {
                messageEl.textContent = map.message;
            } else {
                messageEl.innerHTML = map.message;
            }
            toastEl.appendChild(messageEl);
        }

        // Progress Bar: Ensure it's created and added
        if (options.progressBar) {
            const progressEl = document.createElement('div');
            progressEl.className = options.progressClass;
            toastEl.appendChild(progressEl); // Append to the toast
        }

        // RTL
        if (options.rtl) {
            toastEl.classList.add('rtl');
        }
    }

    /**
     * Create the close button element and prepend it to the toast.
     *
     * @private
     * @param {HTMLElement} toastEl
     * @param {Object} options
     * @returns {HTMLElement} The close button element.
     */
    _buildCloseButton(toastEl, options) {
        const temp = document.createElement('div');
        temp.innerHTML = options.closeHtml.trim();
        const closeEl = temp.firstChild;
        closeEl.className = `${options.closeClass}`;
        closeEl.setAttribute('role', 'button');
        toastEl.insertBefore(closeEl, toastEl.firstChild);
        return closeEl;
    }

    /**
     * Create the progress bar element and prepend it to the toast.
     *
     * @private
     * @param {HTMLElement} toastEl
     * @param {Object} options
     * @returns {HTMLElement} The progress bar element.
     */
    _buildProgressBar(toastEl, options) {
        const progressEl = document.createElement('div');
        progressEl.className = options.progressClass;
        toastEl.insertBefore(progressEl, toastEl.firstChild);
        return progressEl;
    }

    /**
     * Determine whether to prepend or append (newestOnTop).
     *
     * @private
     */
    _setSequence(toastEl, options) {
        if (options.newestOnTop && this._container.firstChild) {
            this._container.insertBefore(toastEl, this._container.firstChild);
        } else {
            this._container.appendChild(toastEl);
        }
    }

    /**
     * Set the aria-live attribute for accessibility.
     *
     * @private
     */
    _setAria(toastEl, iconClass, options) {
        let ariaValue = 'assertive';
        const successCls = options.iconClasses.success;
        const infoCls = options.iconClasses.info;

        if (iconClass === successCls || iconClass === infoCls) {
            ariaValue = 'polite';
        }
        toastEl.setAttribute('aria-live', ariaValue);
    }

    /**
     * Animate and show the toast (fadeIn, slideDown, etc.).
     *
     * @private
     * @param {HTMLElement} toastEl
     * @param {Object} options
     * @param {Object} progressBar
     * @param {Object} response
     */
    _displayToast(toastEl, options, progressBar, response) {
        this._showElement(
            toastEl,
            options.showMethod,
            options.showDuration,
            options.showEasing,
            options.onShown
        );

        // Auto-hide after timeOut
        if (options.timeOut > 0) {
            const intervalId = setTimeout(() => {
                this._hideToast(toastEl, false, options, progressBar, response);
            }, options.timeOut);

            progressBar.maxHideTime = parseFloat(options.timeOut);
            progressBar.hideEta =
                new Date().getTime() + progressBar.maxHideTime;

            // If progressBar is enabled, update it every 10ms
            if (options.progressBar) {
                progressBar.intervalId = setInterval(() => {
                    this._updateProgress(toastEl, progressBar);
                }, 10);

                // Immediately render the bar at full width before interval ticks
                this._updateProgress(toastEl, progressBar);
            }
        }
    }

    /**
     * Attach event listeners (close button, hover, click-to-dismiss, etc.).
     *
     * @private
     */
    _handleEvents(toastEl, closeEl, options, progressBar, response) {
        // Hover to pause
        if (options.closeOnHover) {
            toastEl.addEventListener('mouseenter', () => {
                this._stickAround(toastEl, progressBar);
            });
            toastEl.addEventListener('mouseleave', () => {
                this._delayedHideToast(toastEl, options, progressBar, response);
            });
        }

        // Tap to dismiss
        if (!options.onclick && options.tapToDismiss) {
            toastEl.addEventListener('click', () => {
                this._hideToast(toastEl, false, options, progressBar, response);
            });
        }

        // Close button
        if (options.closeButton && closeEl) {
            closeEl.addEventListener('click', (evt) => {
                evt.stopPropagation?.();
                if (options.onCloseClick) {
                    options.onCloseClick(evt);
                }
                this._hideToast(toastEl, true, options, progressBar, response);
            });
        }

        // Custom onclick
        if (options.onclick) {
            toastEl.addEventListener('click', (evt) => {
                options.onclick(evt);
                this._hideToast(toastEl, false, options, progressBar, response);
            });
        }
    }

    /**
     * Pause the timer while hovering, preventing hide.
     *
     * @private
     */
    _stickAround(toastEl, progressBar) {
        clearInterval(progressBar.intervalId);
        progressBar.hideEta = 0;
        // Re-apply show styling if user wants animations
    }

    /**
     * Resume hide timer after mouse leaves.
     *
     * @private
     */
    _delayedHideToast(toastEl, options, progressBar, response) {
        if (options.timeOut > 0 || options.extendedTimeOut > 0) {
            const intervalId = setTimeout(() => {
                this._hideToast(toastEl, false, options, progressBar, response);
            }, options.extendedTimeOut);

            progressBar.maxHideTime = parseFloat(options.extendedTimeOut);
            progressBar.hideEta =
                new Date().getTime() + progressBar.maxHideTime;
        }
    }

    /**
     * Hide the toast with an optional override (close button).
     *
     * @private
     */
    _hideToast(toastEl, override, options, progressBar, response) {
        try {
            // If closeMethod is specified, use it; otherwise hideMethod
            const method =
                override && options.closeMethod
                    ? options.closeMethod
                    : options.hideMethod;
            const duration =
                override && options.closeDuration !== false
                    ? options.closeDuration
                    : options.hideDuration;
            const easing =
                override && options.closeEasing
                    ? options.closeEasing
                    : options.hideEasing;

            // If the toast is still focused and not forced, do nothing
            if (toastEl.querySelector(':focus') && !override) {
                return;
            }

            // Stop progress updates
            clearInterval(progressBar.intervalId);

            // Animate out
            this._hideElement(toastEl, method, duration, easing, () => {
                this._removeToast(toastEl);
                if (options.onHidden && response.state !== 'hidden') {
                    options.onHidden();
                }
                response.state = 'hidden';
                response.endTime = new Date();
                this._publish(response);
            });
        } catch (err) {
            console.error('[Toasty] Error hiding toast:', err);
        }
    }

    /**
     * Update the width of the progress bar element.
     *
     * @private
     */
    _updateProgress(toastEl, progressBar) {
        const now = new Date().getTime();
        const remaining = Math.max(0, progressBar.hideEta - now);
        const percent = (remaining / progressBar.maxHideTime) * 100;

        // Ensure the progress bar exists
        const barEl = toastEl.querySelector(`.${this._options.progressClass}`);
        if (barEl) {
            barEl.style.width = `${percent}%`;
        }
    }

    /**
     * Publish an event to the subscriber callback, if any.
     *
     * @private
     */
    _publish(args) {
        if (this._listener && typeof this._listener === 'function') {
            try {
                this._listener(args);
            } catch (err) {
                console.error('[Toasty] Listener callback error:', err);
            }
        }
    }

    /**
     * Check if we need to abort displaying this toast due to "preventDuplicates".
     *
     * @private
     * @param {Object} options
     * @param {Object} map
     * @returns {boolean}
     */
    _shouldExit(options, map) {
        if (options.preventDuplicates) {
            if (map.message === this._previousMessage) {
                return true;
            }
            this._previousMessage = map.message;
        }
        return false;
    }

    /**
     * Clear all toasts within the container (with hide animation).
     *
     * @private
     */
    _clearAllToasts() {
        if (!this._container) return;
        const children = Array.from(this._container.children);
        children.forEach((child) => {
            this._clearToast(child, this._options);
        });
    }

    /**
     * Clear/hide a single toast by animating it out.
     *
     * @private
     */
    _clearToast(toastElement, options, clearOptions = {}) {
        const force = !!clearOptions.force;
        if (force || !toastElement.querySelector(':focus')) {
            this._hideElement(
                toastElement,
                options.hideMethod,
                options.hideDuration,
                options.hideEasing,
                () => this._removeToast(toastElement)
            );
            return true;
        }
        return false;
    }

    /**
     * Remove a toast from the DOM (no animation).
     *
     * @private
     */
    _removeToast(toastEl) {
        if (!this._container || !toastEl) return;
        if (toastEl.style.display !== 'none') {
            // It's still animating out; don't remove yet.
            return;
        }
        if (toastEl.parentNode) {
            toastEl.parentNode.removeChild(toastEl);
        }

        // If container is empty, remove it from the DOM
        if (this._container.children.length === 0) {
            this._container.remove();
            this._container = null;
            this._previousMessage = undefined;
        }
    }

    /**
     * FadeIn / SlideDown / Show the toast.
     *
     * @private
     * @param {HTMLElement} el
     * @param {string} method
     * @param {number} duration
     * @param {string} easing
     * @param {Function} [callback]
     */
    _showElement(el, method, duration, easing, callback) {
        // Force layout
        el.style.display = 'block';
        el.offsetHeight; // reflow

        if (method === 'show') {
            // No animation
            el.style.opacity = '1';
            if (callback) callback();
            return;
        }
        if (method === 'slideDown') {
            el.style.overflow = 'hidden';
            el.style.height = '0px';
            el.style.opacity = '1';
            el.style.transition = `height ${duration}ms ${this._mapEasing(
                easing
            )}`;
            const targetHeight = el.scrollHeight + 'px';
            el.style.height = targetHeight;

            el.addEventListener('transitionend', function onSlideDown() {
                el.removeEventListener('transitionend', onSlideDown);
                el.style.height = 'auto';
                el.style.overflow = '';
                if (callback) callback();
            });
            return;
        }

        // Default: fadeIn
        el.style.transition = `opacity ${duration}ms ${this._mapEasing(
            easing
        )}`;
        el.style.opacity = '0';
        requestAnimationFrame(() => {
            el.style.opacity = '1';
        });

        el.addEventListener('transitionend', function onFadeIn() {
            el.removeEventListener('transitionend', onFadeIn);
            if (callback) callback();
        });
    }

    /**
     * FadeOut / SlideUp / Hide the toast.
     *
     * @private
     */
    _hideElement(el, method, duration, easing, callback) {
        if (method === 'hide') {
            el.style.display = 'none';
            if (callback) callback();
            return;
        }
        if (method === 'slideUp') {
            el.style.overflow = 'hidden';
            el.style.height = el.scrollHeight + 'px';
            el.offsetHeight; // reflow
            el.style.transition = `height ${duration}ms ${this._mapEasing(
                easing
            )}`;
            el.style.height = '0px';

            el.addEventListener('transitionend', function onSlideUp() {
                el.removeEventListener('transitionend', onSlideUp);
                el.style.display = 'none';
                if (callback) callback();
            });
            return;
        }

        // Default: fadeOut
        el.style.transition = `opacity ${duration}ms ${this._mapEasing(
            easing
        )}`;
        el.style.opacity = '1';
        requestAnimationFrame(() => {
            el.style.opacity = '0';
        });

        el.addEventListener('transitionend', function onFadeOut() {
            el.removeEventListener('transitionend', onFadeOut);
            el.style.display = 'none';
            if (callback) callback();
        });
    }

    /**
     * Map "swing"/"linear" to standard CSS timing functions.
     *
     * @private
     */
    _mapEasing(easing) {
        const easingMap = {
            swing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
            linear: 'linear',
        };
        return easingMap[easing] || 'linear';
    }

    /**
     * Return the default options for Toasty.
     *
     * @private
     * @returns {Object} Default configuration.
     */
    _getDefaults() {
        return {
            tapToDismiss: true,
            toastClass: 'toast',
            containerId: 'toast-container',
            debug: false,

            showMethod: 'fadeIn', // 'fadeIn' | 'slideDown' | 'show'
            showDuration: 300,
            showEasing: 'swing', // 'swing' | 'linear'
            onShown: undefined,

            hideMethod: 'fadeOut', // 'fadeOut' | 'slideUp' | 'hide'
            hideDuration: 1000,
            hideEasing: 'swing', // 'swing' | 'linear'
            onHidden: undefined,

            closeMethod: false,
            closeDuration: false,
            closeEasing: false,
            closeOnHover: true,

            extendedTimeOut: 1000, // Time added if hover
            iconClasses: {
                error: 'toast-error',
                info: 'toast-info',
                success: 'toast-success',
                warning: 'toast-warning',
            },
            iconClass: 'toast-info',
            positionClass: 'toast-top-right',
            timeOut: 5000, // 0 = sticky
            titleClass: 'toast-title',
            messageClass: 'toast-message',
            escapeHtml: false,
            target: 'body',
            closeHtml: '<button type="button">&times;</button>',
            closeClass: 'toast-close-button',
            newestOnTop: false,
            preventDuplicates: false,
            progressBar: false,
            progressClass: 'toast-progress',
            rtl: false,
        };
    }
}

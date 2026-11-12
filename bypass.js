(function() {
    // Toggle OFF thakle bypass kaj korbe na
    

    let adblockDetectedBySite = false;

    window.adsbygoogle = { loaded: true, push: function() {} };
    window.googletag = { cmd: [], apiReady: true, pubads: () => ({}) };
    window.canRunAds = true;
    window.isAdBlockActive = false;

    const origFetch = window.fetch;
    window.fetch = async function(...args) {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
        if (/adsbygoogle|gpt\.js|ad_status|ad\.js|sodar|pagead|doubleclick|generate_204/i.test(url)) {
            if (url.includes('generate_204')) {
                return new Response(null, { status: 204 });
            }
            const dummyBody = "window.adsbygoogle={loaded:true,push:function(){}};window.canRunAds=true;/*" + "A".repeat(1500) + "*/";
            return new Response(dummyBody, {
                status: 200,
                statusText: 'OK',
                headers: { 'Content-Type': 'application/javascript' }
            });
        }
        return origFetch.apply(this, args);
    };

    const origAppend = Element.prototype.appendChild;
    Element.prototype.appendChild = function(node) {
        if (node && node.tagName === 'SCRIPT' && node.src && /ad\.js|adsbygoogle|gpt\.js|pagead/i.test(node.src)) {
            setTimeout(() => {
                if (typeof node.onload === 'function') node.onload(new Event('load'));
                node.dispatchEvent(new Event('load'));
            }, 5);
            return node;
        }
        return origAppend.call(this, node);
    };

    const origOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
    const origOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
    
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
        get() {
            if (this.className && typeof this.className === 'string' && /ad|ads|banner|sponsor|adsbygoogle/i.test(this.className) && !this.className.includes('sp-')) {
                return 100;
            }
            return origOffsetHeight.get.call(this);
        }
    });
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
        get() {
            if (this.className && typeof this.className === 'string' && /ad|ads|banner|sponsor|adsbygoogle/i.test(this.className) && !this.className.includes('sp-')) {
                return 300;
            }
            return origOffsetWidth.get.call(this);
        }
    });

    let userClickedPause = false;

    document.addEventListener('click', (e) => {
        const target = e.target.closest('.sp-root, button, .sp-chrome');
        if (!target) return;

        const video = document.querySelector('.sp-root video') || document.querySelector('video');
        if (!video) return;

        if (video.paused) {
            userClickedPause = false;
            video.play().catch(() => {});
        } else {
            userClickedPause = true;
        }
    }, true);

    const origPause = HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.pause = function() {
        if (adblockDetectedBySite && !userClickedPause) {
            return;
        }
        return origPause.apply(this, arguments);
    };

    const unlockPlayer = () => {
        const overlay = document.querySelector('.sp-adblock-overlay');
        if (overlay) {
            adblockDetectedBySite = true;
            overlay.remove();
        }

        const videos = document.querySelectorAll('video');
        videos.forEach(v => {
            if (v.style.display === 'none' && v.src) {
                v.style.setProperty('display', 'block', 'important');
            }
        });
    };

    const observer = new MutationObserver(unlockPlayer);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('DOMContentLoaded', unlockPlayer);
})();
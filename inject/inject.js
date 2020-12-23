const currentScript = document.currentScript;
window.BatchUiBuilder = (function () {
    class BatchUiBuilder {
        constructor(baseUrl = "/") {
            this.baseUrl = baseUrl;
        }
        inject(elementReference) {
            const targetElement = document.querySelector(elementReference);
            if (!targetElement) {
                console.error(`Element ${elementReference} not found!`);
                return;
            }
            const iframe = document.createElement("iframe");
            console.log(currentScript);
            // iframe.src = "http://localhost:4200/?api_base_url=" + encodeURIComponent(this.baseUrl);
            iframe.src = "https://ml-service-wrapper.github.io/ml-service-wrapper-host-http-ui/process?api_base_url=" + encodeURIComponent(this.baseUrl);
            iframe.style.position = "fixed";
            iframe.style.left = "0";
            iframe.style.right = "0";
            iframe.style.top = "0";
            iframe.style.bottom = "0";
            iframe.style.width = "100%";
            iframe.style.height = "100%";
            iframe.style.padding = "0";
            iframe.style.margin = "0";
            iframe.style.border = "none";
            targetElement.appendChild(iframe);
        }
    }
    return BatchUiBuilder;
})();
//# sourceMappingURL=inject.js.map
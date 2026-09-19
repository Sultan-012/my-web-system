```javascript
// ============================================
// OXINA STORE
// CART + TIKTOK PIXEL TRACKING
// ============================================

let cart = [];


// ============================================
// TikTok Pixel
// ============================================

function trackTikTokEvent(eventName, data = {}) {
    if (typeof window.ttq !== "undefined" &&
        typeof window.ttq.track === "function") {

        try {
            window.ttq.track(eventName, data);
            console.log("[TikTok]", eventName, data);
        } catch (error) {
            console.error("TikTok Error:", error);
        }
    }
}


// ============================================
// Generate Product ID
// ============================================

function generateProductId(title) {
    let hash = 0;

    for (let i = 0; i < title.length; i++) {
        hash = ((hash << 5) - hash) + title.charCodeAt(i);
        hash |= 0;
    }

    return "OXINA-" + Math.abs(hash);
}


// ============================================
// ADD TO CART
// ============================================

function addToCart(title, price) {

    console.log("Adding product:", title, price);

    price = Number(price);

    if (isNaN(price)) {
        console.error("Invalid product price:", price);
        return;
    }

    let existingItem = cart.find(function (item) {
        return item.title === title;
    });


    // المنتج موجود مسبقًا
    if (existingItem) {

        existingItem.qty += 1;

    }

    // منتج جديد
    else {

        cart.push({
            id: generateProductId(title),
            title: title,
            price: price,
            qty: 1
        });

    }


    // تحديث السلة
    updateCartUI();


    // TikTok AddToCart
    trackTikTokEvent("AddToCart", {

        contents: [
            {
                content_id: generateProductId(title),
                content_type: "product",
                content_name: title,
                quantity: 1,
                price: price
            }
        ],

        value: price,
        currency: "SAR"

    });


    console.log("Cart:", cart);
}


// ============================================
// UPDATE QUANTITY
// ============================================

function updateQty(index, change) {

    if (!cart[index]) {
        return;
    }

    cart[index].qty += change;


    if (cart[index].qty <= 0) {
        cart.splice(index, 1);
    }


    updateCartUI();
}


// ============================================
// UPDATE CART UI
// ============================================

function updateCartUI() {

    const listContainer =
        document.getElementById("cartItemsList");

    const cartBadge =
        document.getElementById("cartBadge");

    const cartTotalPrice =
        document.getElementById("cartTotalPrice");


    if (!listContainer ||
        !cartBadge ||
        !cartTotalPrice) {

        console.error("Cart HTML elements not found.");
        return;
    }


    // السلة فارغة
    if (cart.length === 0) {

        listContainer.innerHTML = `
            <p style="
                text-align:center;
                color:var(--text-muted);
                margin:20px 0;
            ">
                السلة فارغة حالياً.
                أضف بعض العروض من الأعلى!
            </p>
        `;

        cartBadge.innerText = "0";
        cartTotalPrice.innerText = "0 ريال";

        return;
    }


    let html = "";
    let totalCost = 0;
    let totalItemsCount = 0;


    cart.forEach(function (item, index) {

        const itemTotal =
            item.price * item.qty;

        totalCost += itemTotal;
        totalItemsCount += item.qty;


        html += `
            <div class="cart-item">

                <div>

                    <div style="
                        font-weight:700;
                        color:var(--primary);
                    ">
                        ${item.title}
                    </div>

                    <div style="
                        font-size:0.85rem;
                        color:var(--text-muted);
                    ">
                        ${item.price} ريال ×
                        ${item.qty} =
                        ${itemTotal} ريال
                    </div>

                </div>


                <div class="qty-controls">

                    <button
                        type="button"
                        class="qty-btn"
                        onclick="updateQty(${index}, -1)"
                    >
                        -
                    </button>

                    <span style="font-weight:bold;">
                        ${item.qty}
                    </span>

                    <button
                        type="button"
                        class="qty-btn"
                        onclick="updateQty(${index}, 1)"
                    >
                        +
                    </button>

                </div>

            </div>
        `;

    });


    listContainer.innerHTML = html;

    cartBadge.innerText = totalItemsCount;

    cartTotalPrice.innerText =
        totalCost + " ريال";
}


// ============================================
// PROCEED TO CHECKOUT
// ============================================

function proceedToCheckout() {

    const cartCount = cart.reduce(
        function (total, item) {
            return total + item.qty;
        },
        0
    );


    if (cartCount <= 0) {

        alert(
            "السلة فارغة حالياً! يرجى اختيار أحد العروض وإضافته للسلة أولاً."
        );

        return;
    }


    const totalValue = cart.reduce(
        function (total, item) {
            return total + (item.price * item.qty);
        },
        0
    );


    // TikTok InitiateCheckout
    trackTikTokEvent("InitiateCheckout", {

        contents: cart.map(function (item) {

            return {
                content_id: item.id,
                content_type: "product",
                content_name: item.title,
                quantity: item.qty,
                price: item.price
            };

        }),

        value: totalValue,
        currency: "SAR"

    });


    const checkoutSection =
        document.querySelector(".checkout-grid");


    if (checkoutSection) {

        checkoutSection.scrollIntoView({
            behavior: "smooth"
        });

    } else {

        window.location.hash = "cart";

    }
}


// ============================================
// SLIDER
// ============================================

function scrollSlider(containerId, distance) {

    const container =
        document.getElementById(containerId);

    if (!container) {
        return;
    }


    container.scrollBy({
        left: distance,
        behavior: "smooth"
    });
}


// ============================================
// DOM READY
// ============================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        const heroSection =
            document.getElementById("hero");


        if (heroSection) {

            setTimeout(function () {

                heroSection.classList.add("appear");

            }, 100);

        }


        console.log("OXINA Store JS loaded successfully.");

    }
);


// ============================================
// ORDER FORM
// ============================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        const orderForm =
            document.getElementById("orderForm");


        if (!orderForm) {

            console.error("orderForm not found.");

            return;
        }


        orderForm.addEventListener(
            "submit",
            async function (e) {

                e.preventDefault();


                // -------------------------------
                // Check Cart
                // -------------------------------

                if (cart.length === 0) {

                    alert(
                        "يرجى إضافة عرض واحد على الأقل للسلة قبل إرسال الفاتورة!"
                    );

                    return;
                }


                // -------------------------------
                // Customer Data
                // -------------------------------

                const name =
                    document
                        .getElementById("userName")
                        .value
                        .trim();


                const phone =
                    document
                        .getElementById("userPhone")
                        .value
                        .trim();


                const city =
                    document
                        .getElementById("userCity")
                        .value
                        .trim();


                // -------------------------------
                // Calculate Total
                // -------------------------------

                const grandTotal =
                    cart.reduce(
                        function (total, item) {
                            return total +
                                (item.price * item.qty);
                        },
                        0
                    );


                // -------------------------------
                // TikTok PlaceAnOrder
                // -------------------------------

                trackTikTokEvent(
                    "PlaceAnOrder",
                    {

                        contents: cart.map(
                            function (item) {

                                return {
                                    content_id: item.id,
                                    content_type: "product",
                                    content_name: item.title,
                                    quantity: item.qty,
                                    price: item.price
                                };

                            }
                        ),

                        value: grandTotal,
                        currency: "SAR"

                    }
                );


                // -------------------------------
                // WhatsApp
                // -------------------------------

                const salesWhatsAppNumber =
                    "966561245965";


                let invoiceItemsText = "";


                cart.forEach(
                    function (item, index) {

                        const subTotal =
                            item.price * item.qty;


                        invoiceItemsText +=
                            "%0A" +
                            (index + 1) +
                            ". *" +
                            encodeURIComponent(item.title) +
                            "* (الكمية: " +
                            item.qty +
                            ") - السعر: " +
                            subTotal +
                            " ريال";

                    }
                );


                const invoiceMsg =

                    "🧾 *فاتورة طلب جديدة - متجر أوكسينا OXINA*%0A" +

                    "----------------------------------%0A" +

                    "👤 *بيانات الزبون:*%0A" +

                    "• *الاسم:* " +
                    encodeURIComponent(name) +
                    "%0A" +

                    "• *رقم الجوال:* " +
                    encodeURIComponent(phone) +
                    "%0A" +

                    "• *المدينة والعنوان:* " +
                    encodeURIComponent(city) +
                    "%0A" +

                    "----------------------------------%0A" +

                    "📦 *تفاصيل الفاتورة والمشتريات:*" +

                    invoiceItemsText +

                    "%0A----------------------------------%0A" +

                    "💰 *الإجمالي النهائي:* " +
                    grandTotal +
                    " ريال سعودي (شحن مجاني)%0A%0A" +

                    "📞 *يرجى التواصل مع الزبون للتأكيد والشحن.*";


                const whatsappURL =
                    "https://wa.me/" +
                    salesWhatsAppNumber +
                    "?text=" +
                    invoiceMsg;


                window.open(
                    whatsappURL,
                    "_blank"
                );

            }
        );

    }
);


// ============================================
// IMPORTANT:
// Make functions available to HTML onclick
// ============================================

window.addToCart = addToCart;
window.updateQty = updateQty;
window.proceedToCheckout = proceedToCheckout;
window.scrollSlider = scrollSlider;

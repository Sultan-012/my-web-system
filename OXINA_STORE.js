```javascript
// ============================================
// OXINA STORE - CART + TIKTOK PIXEL TRACKING
// ============================================

// Array to store cart elements
let cart = [];


// ============================================
// TikTok Pixel Helper Functions
// ============================================

/**
 * إرسال حدث إلى TikTok Pixel
 */
function trackTikTokEvent(eventName, data = {}) {
    if (typeof ttq !== 'undefined' && typeof ttq.track === 'function') {
        try {
            ttq.track(eventName, data);
            console.log(`[TikTok] ${eventName}`, data);
        } catch (error) {
            console.error(`[TikTok] Error tracking ${eventName}:`, error);
        }
    }
}


/**
 * SHA-256 hashing
 * يستخدم فقط عند الحاجة لإرسال PII إلى TikTok
 */
async function sha256(value) {
    if (!value) return null;

    const encoder = new TextEncoder();
    const data = encoder.encode(value.trim().toLowerCase());

    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    return Array.from(new Uint8Array(hashBuffer))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}


/**
 * تنظيف رقم الجوال السعودي قبل SHA-256
 *
 * مثال:
 * 0561234567
 * يصبح:
 * 966561234567
 */
function normalizeSaudiPhone(phone) {
    if (!phone) return '';

    let cleaned = phone.replace(/\D/g, '');

    if (cleaned.startsWith('00')) {
        cleaned = cleaned.substring(2);
    }

    if (cleaned.startsWith('0')) {
        cleaned = '966' + cleaned.substring(1);
    }

    if (!cleaned.startsWith('966')) {
        cleaned = '966' + cleaned;
    }

    return cleaned;
}


/**
 * إرسال بيانات العميل المشفرة إلى TikTok
 *
 * ملاحظة:
 * استخدم هذه الوظيفة فقط إذا كان لديك الأساس/الموافقة
 * المناسبة لإرسال هذه البيانات إلى TikTok.
 */
async function identifyTikTokCustomer(phone) {
    if (
        typeof ttq === 'undefined' ||
        typeof ttq.identify !== 'function' ||
        !phone
    ) {
        return;
    }

    try {
        const normalizedPhone = normalizeSaudiPhone(phone);

        if (!normalizedPhone) return;

        const hashedPhone = await sha256(normalizedPhone);

        ttq.identify({
            phone_number: hashedPhone
        });

        console.log('[TikTok] Customer identified');
    } catch (error) {
        console.error('[TikTok] Identify error:', error);
    }
}


// ============================================
// Proceed To Checkout
// ============================================

function proceedToCheckout() {

    let cartCount = 0;

    // إذا كان لديك مصفوفة باسم cart
    if (typeof cart !== 'undefined' && Array.isArray(cart)) {
        cartCount = cart.reduce((total, item) => total + item.qty, 0);
    } else {

        // قراءة الرقم الموجود في أيقونة السلة
        const badge = document.querySelector('.cart-badge');

        if (badge) {
            cartCount = parseInt(badge.textContent) || 0;
        }
    }


    // ========================================
    // Cart contains products
    // ========================================

    if (cartCount > 0) {

        // حساب إجمالي السلة
        const totalValue = cart.reduce(
            (total, item) => total + (item.price * item.qty),
            0
        );


        // ====================================
        // TikTok - InitiateCheckout
        // ====================================

        trackTikTokEvent('InitiateCheckout', {

            contents: cart.map(item => ({
                content_id: item.id,
                content_type: 'product',
                content_name: item.title,
                quantity: item.qty,
                price: item.price
            })),

            value: totalValue,

            currency: 'SAR'
        });


        // البحث عن قسم الدفع
        const checkoutSection =
            document.getElementById('checkout') ||
            document.querySelector('.checkout-grid');


        if (checkoutSection) {

            checkoutSection.scrollIntoView({
                behavior: 'smooth'
            });

        } else {

            window.location.href = '#checkout';
        }

    }

    // ========================================
    // Cart is empty
    // ========================================

    else {

        alert(
            'السلة فارغة حالياً! يرجى اختيار أحد العروض وإضافته للسلة أولاً.'
        );
    }
}


// ============================================
// Horizontal Slider
// ============================================

function scrollSlider(containerId, distance) {

    const container = document.getElementById(containerId);

    if (container) {

        container.scrollBy({
            left: distance,
            behavior: 'smooth'
        });

    }
}


// ============================================
// DOM Loaded
// ============================================

document.addEventListener('DOMContentLoaded', function () {

    // تحديد عنصر الـ Banner
    const heroSection = document.getElementById('hero');

    // تشغيل Animation
    if (heroSection) {

        setTimeout(function () {

            heroSection.classList.add('appear');

        }, 100);

    }

});


// ============================================
// Add Product To Cart
// ============================================

function addToCart(title, price) {

    const existingItem = cart.find(
        item => item.title === title
    );


    // ========================================
    // Existing Product
    // ========================================

    if (existingItem) {

        existingItem.qty += 1;

    }

    // ========================================
    // New Product
    // ========================================

    else {

        // إنشاء ID ثابت للمنتج
        const productId = generateProductId(title);

        cart.push({

            id: productId,

            title: title,

            price: Number(price),

            qty: 1

        });

    }


    // تحديث السلة
    updateCartUI();


    // ========================================
    // TikTok - AddToCart
    // ========================================

    trackTikTokEvent('AddToCart', {

        contents: [

            {

                content_id: generateProductId(title),

                content_type: 'product',

                content_name: title,

                quantity: 1,

                price: Number(price)

            }

        ],

        value: Number(price),

        currency: 'SAR'

    });


    console.log(
        `[TikTok] AddToCart: ${title} - ${price} SAR`
    );
}


// ============================================
// Generate Product ID
// ============================================

function generateProductId(title) {

    return 'OXINA-' +
        Array.from(title)
            .reduce(
                (hash, char) =>
                    ((hash << 5) - hash) + char.charCodeAt(0),
                0
            )
            .toString()
            .replace('-', '');

}


// ============================================
// Change Item Quantity
// ============================================

function updateQty(index, change) {

    if (!cart[index]) return;


    cart[index].qty += change;


    if (cart[index].qty <= 0) {

        cart.splice(index, 1);

    }


    updateCartUI();
}


// ============================================
// Update Cart UI
// ============================================

function updateCartUI() {

    const listContainer =
        document.getElementById('cartItemsList');

    const cartBadge =
        document.getElementById('cartBadge');

    const cartTotalPrice =
        document.getElementById('cartTotalPrice');


    if (!listContainer || !cartBadge || !cartTotalPrice) {
        return;
    }


    // ========================================
    // Empty Cart
    // ========================================

    if (cart.length === 0) {

        listContainer.innerHTML = `
            <p style="
                text-align: center;
                color: var(--text-muted);
                margin: 20px 0;
            ">
                السلة فارغة حالياً.
                أضف بعض العروض من الأعلى!
            </p>
        `;

        cartBadge.innerText = '0';

        cartTotalPrice.innerText = '0 ريال';

        return;
    }


    let html = '';

    let totalCost = 0;

    let totalItemsCount = 0;


    cart.forEach((item, idx) => {

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
                        class="qty-btn"
                        onclick="updateQty(${idx}, -1)"
                    >
                        -
                    </button>

                    <span style="font-weight:bold;">
                        ${item.qty}
                    </span>

                    <button
                        class="qty-btn"
                        onclick="updateQty(${idx}, 1)"
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
        `${totalCost} ريال`;
}


// ============================================
// Submit Order
// ============================================

const orderForm =
    document.getElementById('orderForm');


if (orderForm) {

    orderForm.addEventListener(
        'submit',
        async function (e) {

            e.preventDefault();


            // ====================================
            // Validate Cart
            // ====================================

            if (cart.length === 0) {

                alert(
                    'يرجى إضافة عرض واحد على الأقل للسلة قبل إرسال الفاتورة!'
                );

                return;
            }


            // ====================================
            // Get Customer Data
            // ====================================

            const name =
                document
                    .getElementById('userName')
                    .value
                    .trim();


            const phone =
                document
                    .getElementById('userPhone')
                    .value
                    .trim();


            const city =
                document
                    .getElementById('userCity')
                    .value
                    .trim();


            // ====================================
            // Calculate Total
            // ====================================

            let grandTotal = 0;


            cart.forEach(item => {

                grandTotal +=
                    item.price * item.qty;

            });


            // ====================================
            // TikTok Customer Identification
            // ====================================

            /*
             * يتم تشفير رقم الهاتف SHA-256
             * قبل إرساله إلى TikTok.
             *
             * لا يتم إرسال الاسم أو رقم الهاتف
             * كنص واضح إلى TikTok.
             */

            await identifyTikTokCustomer(phone);


            // ====================================
            // TikTok - PlaceAnOrder
            // ====================================

            trackTikTokEvent(
                'PlaceAnOrder',
                {

                    contents: cart.map(item => ({

                        content_id: item.id,

                        content_type: 'product',

                        content_name: item.title,

                        quantity: item.qty,

                        price: item.price

                    })),

                    value: grandTotal,

                    currency: 'SAR'

                }
            );


            // ====================================
            // WhatsApp Sales Number
            // ====================================

            const salesWhatsAppNumber =
                '966561245965';


            // ====================================
            // Build Invoice
            // ====================================

            let invoiceItemsText = '';


            cart.forEach((item, i) => {

                const subTotal =
                    item.price * item.qty;


                invoiceItemsText +=
                    `%0A  ${i + 1}. *${item.title}* ` +
                    `(الكمية: ${item.qty}) ` +
                    `- السعر: ${subTotal} ريال`;

            });


            const invoiceMsg =

                `🧾 *فاتورة طلب جديدة - متجر أوكسينا OXINA*%0A` +

                `----------------------------------%0A` +

                `👤 *بيانات الزبون:*%0A` +

                `• *الاسم:* ${name}%0A` +

                `• *رقم الجوال:* ${phone}%0A` +

                `• *المدينة والعنوان:* ${city}%0A` +

                `----------------------------------%0A` +

                `📦 *تفاصيل الفاتورة والمشتريات:*` +

                `${invoiceItemsText}%0A` +

                `----------------------------------%0A` +

                `💰 *الإجمالي النهائي:* ${grandTotal} ريال سعودي (شحن مجاني)%0A%0A` +

                `📞 *يرجى التواصل مع الزبون للتأكيد والشحن.*`;


            // ====================================
            // Open WhatsApp
            // ====================================

            const whatsappURL =
                `https://wa.me/${salesWhatsAppNumber}?text=${invoiceMsg}`;


            window.open(
                whatsappURL,
                '_blank'
            );


            // ====================================
            // NOTE:
            // لا نرسل Purchase هنا.
            //
            // لأن إرسال الطلب إلى WhatsApp
            // لا يعني أن عملية الشراء اكتملت.
            //
            // Purchase يجب إرساله عندما يتم
            // تأكيد الطلب/الدفع فعلياً.
            // ====================================

        }
    );

}
```

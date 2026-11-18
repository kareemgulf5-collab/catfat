import { BRANDS } from './data.js';
import { initAuth, auth, isAdmin, isIn, logout, changeOwnPassword } from './auth.js';
import { viewInvoices, viewInvoiceEditor, viewUsers, viewLogin, mountInvoiceView, invoiceClick, invoiceInput, invoiceChange, invoiceKey, invoiceSubmit, confirmLeave, editorHash, hasUnsaved, resetAppState, toast } from './invoices.js';

export const WA = '201554052642';
export const img = k => k ? `${k}.webp` : '';

const COUNTRIES = [
  {r:'gulf', list:[['الإمارات','UAE'],['السعودية','Saudi Arabia'],['قطر','Qatar'],['الكويت','Kuwait'],['البحرين','Bahrain'],['عمان','Oman'],['العراق','Iraq'],['الأردن','Jordan'],['فلسطين','Palestine'],['لبنان','Lebanon'],['سوريا','Syria'],['اليمن','Yemen'],['تركيا','Turkey']]},
  {r:'africa', list:[['ليبيا','Libya'],['المغرب','Morocco'],['السودان','Sudan'],['جنوب أفريقيا','South Africa'],['كينيا','Kenya'],['أوغندا','Uganda'],['جيبوتي','Djibouti'],['تشاد','Chad'],['السنغال','Senegal'],['مدغشقر','Madagascar'],['موريشيوس','Mauritius'],['ساو تومي','São Tomé'],['النيجر','Niger',1],['غانا','Ghana',1]]},
  {r:'europe', list:[['ألمانيا','Germany'],['فرنسا','France'],['هولندا','Netherlands'],['بلجيكا','Belgium'],['السويد','Sweden'],['إنجلترا','England'],['النرويج','Norway',1]]},
  {r:'americas', list:[['أمريكا','United States'],['كندا','Canada'],['كوبا','Cuba']]},
  {r:'asia', list:[['الهند','India']]},
];
const COUNTRY_FR = {'UAE':'Émirats arabes unis','Saudi Arabia':'Arabie saoudite','Qatar':'Qatar','Kuwait':'Koweït','Bahrain':'Bahreïn','Oman':'Oman','Iraq':'Irak','Jordan':'Jordanie','Palestine':'Palestine','Lebanon':'Liban','Syria':'Syrie','Yemen':'Yémen','Turkey':'Turquie','Libya':'Libye','Morocco':'Maroc','Sudan':'Soudan','South Africa':'Afrique du Sud','Kenya':'Kenya','Uganda':'Ouganda','Djibouti':'Djibouti','Chad':'Tchad','Senegal':'Sénégal','Madagascar':'Madagascar','Mauritius':'Maurice','São Tomé':'Sao Tomé','Niger':'Niger','Ghana':'Ghana','Germany':'Allemagne','France':'France','Netherlands':'Pays-Bas','Belgium':'Belgique','Sweden':'Suède','England':'Angleterre','Norway':'Norvège','United States':'États-Unis','Canada':'Canada','Cuba':'Cuba','India':'Inde'};
const ACTIVE_COUNTRIES = COUNTRIES.reduce((s,g)=>s+g.list.filter(c=>!c[2]).length,0);

const TR = {
  ar:{
    navBrands:'الماركات', navPrices:'قائمة الأسعار', navCountries:'بلاد التصدير', navAbout:'عن الشركة',
    wa:'واتساب',
    heroTitle:'سناكس وحلويات مصرية، جاهزة للشحن لأي سوق في العالم',
    heroLead:'كل منتج معروض بمواصفات التعبئة والشحن وسعر الكرتونة، علشان تحسب طلبيتك قبل ما تكلمنا.',
    ctaBrowse:'تصفّح المنتجات', ctaPrices:'قائمة الأسعار',
    fSince:'سنة التأسيس', fBrands:'ماركات', fProducts:'منتج', fCountries:'دولة تصدير',
    brandsTitle:'الماركات', brandsSub:'اختار الماركة علشان تشوف منتجاتها ونكهاتها وأسعارها.',
    catAll:'الكل', snacks:'سناكس وشيبس', lollipops:'مصاصات', candy:'حلويات ولبان',
    products:'منتج', product1:'منتج', from:'يبدأ من', perCarton:'/ كرتونة', flavours:'نكهة', packs:'أشكال تعبئة',
    askPrice:'السعر عند الطلب', allBrands:'كل الماركات',
    plTitle:'قائمة الأسعار', plNote:'كل الأسعار بالدولار الأمريكي للكرتونة الواحدة. اضغط على أي منتج علشان تشوف تفاصيله.',
    plSearch:'ابحث باسم المنتج أو الماركة', print:'طباعة القائمة', noResults:'مفيش منتجات بالاسم ده. جرّب اسم الماركة أو كلمة أقصر.',
    thProduct:'المنتج', thWeight:'الوزن', thPack:'التعبئة', thNo:'العدد', thBox:'مقاس الكرتونة (سم)', thCarton:'محتوى الكرتونة', thCbm:'CBM', thFt:'كرتونة / 40 قدم', thPrice:'سعر الكرتونة',
    ctryTitle:'بلاد التصدير', ctrySub:'منتجاتنا موجودة في {n} دولة، ودول جديدة على الطريق.', soon:'قريبًا', countriesN:'دولة',
    gulf:'الخليج والشرق الأوسط', africa:'أفريقيا', europe:'أوروبا', americas:'الأمريكتين', asia:'آسيا',
    aboutTitle:'عن إيجي جلف',
    aboutText:'تأسست إيجي جلف عام 2001 تحت اسم دلتا للصناعات الغذائية، وبعد كده أصبحت الشركة المصرية الخليجية (إيجي جلف). الشركة رائدة في إنتاج الوجبات الخفيفة والحلويات الجافة، وكل منتجاتها معبأة بشكل آلي بالكامل. للشركة فروع في كل محافظات مصر، ومنتجاتها بتتصدّر لأكتر من {n} دولة حول العالم. وتميزت إيجي جلف بتقديم أول سناكس صحية مخبوزة في الفرن في مصر.',
    missionTitle:'رسالتنا', missionText:'تقديم مجموعة متنوعة من الكراكرز والحلويات عالية الجودة، وتجارب طعم ترضي كل الأذواق، مع الالتزام بأعلى معايير الجودة والتغذية.',
    visionTitle:'رؤيتنا', visionText:'أن نكون من رواد صناعة الأغذية عالميًا ونضع معيار الابتكار في السناكس والحلويات، وأن نلهم أسلوب حياة أكثر صحة ومتعة من خلال منتجاتنا.',
    certsTitle:'الشهادات والاعتمادات', certified:'معتمد',
    ctTitle:'محتاج عرض سعر أو عينات؟', ctDesc:'امسح الكود أو ابعتلنا على واتساب، وفريق التصدير هيرد عليك بالأسعار ومواعيد الشحن.', ctBtn:'كلّمنا على واتساب',
    footTxt:'إيجي جلف للأغذية — دلتا للصناعات الغذائية، منذ 2001',
    mCartonPrice:'سعر الكرتونة', mContainer:'كونتينر 40 قدم كامل:', mCartons:'كرتونة', mApprox:'≈',
    mQuote:'اطلب عرض سعر', mFlavours:'النكهات المتاحة', mSpecs:'مواصفات التعبئة والشحن', mPick:'اختار شكل التعبئة من الجدول', close:'إغلاق',
    waMsg:'السلام عليكم، محتاج عرض سعر لـ {p} ({b}) — {pack}.', waGeneral:'السلام عليكم، محتاج أعرف أكتر عن منتجات إيجي جلف وأسعار التصدير.',
    pack:{Bag:'كيس',Bags:'كيس',BAG:'كيس',Jar:'برطمان',Box:'علبة',Tree:'شجرة',Car:'عربية',Piece:'قطعة'},
  },
  en:{
    navBrands:'Brands', navPrices:'Price list', navCountries:'Export markets', navAbout:'About us',
    wa:'WhatsApp',
    heroTitle:'Egyptian snacks and confectionery, ready to ship to any market',
    heroLead:'Every product is listed with its packing, shipping specs and carton price, so you can plan your order before you contact us.',
    ctaBrowse:'Browse products', ctaPrices:'Price list',
    fSince:'Founded', fBrands:'Brands', fProducts:'Products', fCountries:'Export countries',
    brandsTitle:'Our brands', brandsSub:'Pick a brand to see its products, flavours and prices.',
    catAll:'All', snacks:'Snacks & chips', lollipops:'Lollipops', candy:'Candy & gum',
    products:'products', product1:'product', from:'From', perCarton:'/ carton', flavours:'flavours', packs:'pack sizes',
    askPrice:'Price on request', allBrands:'All brands',
    plTitle:'Price list', plNote:'All prices are in US dollars per carton. Select any product to see its details.',
    plSearch:'Search by product or brand', print:'Print list', noResults:'No products match that name. Try the brand name or a shorter word.',
    thProduct:'Product', thWeight:'Weight', thPack:'Packing', thNo:'Count', thBox:'Carton size (cm)', thCarton:'Carton content', thCbm:'CBM', thFt:'Cartons / 40ft', thPrice:'Carton price',
    ctryTitle:'Export markets', ctrySub:'Our products are sold in {n} countries, with more on the way.', soon:'soon', countriesN:'countries',
    gulf:'Gulf & Middle East', africa:'Africa', europe:'Europe', americas:'Americas', asia:'Asia',
    aboutTitle:'About EgyGulf',
    aboutText:'EgyGulf was founded in 2001 as Delta Foods Industries and later became the Egyptian-Gulf Company (EgyGulf). It is a leading producer of snacks and dry confectionery, all packed fully automatically. The company has branches across Egypt and exports to more than {n} countries. EgyGulf introduced the first oven-baked healthy snacks in Egypt.',
    missionTitle:'Our mission', missionText:'To offer a diverse range of high-quality crackers and confectionery, creating taste experiences for every preference while meeting the highest standards of quality and nutrition.',
    visionTitle:'Our vision', visionText:'To be a world-class leader in the food industry, setting the bar for innovation in snacks and confectionery, and to inspire a healthier, more enjoyable lifestyle through our products.',
    certsTitle:'Certifications', certified:'Certified',
    ctTitle:'Need a quote or samples?', ctDesc:'Scan the code or message us on WhatsApp. Our export team will reply with prices and shipping dates.', ctBtn:'Message us on WhatsApp',
    footTxt:'EgyGulf Foods — Delta Foods Industries, since 2001',
    mCartonPrice:'Carton price', mContainer:'Full 40ft container:', mCartons:'cartons', mApprox:'≈',
    mQuote:'Request a quote', mFlavours:'Available flavours', mSpecs:'Packing & shipping specs', mPick:'Select a packing row in the table', close:'Close',
    waMsg:'Hello, I would like a quote for {p} ({b}) — {pack}.', waGeneral:'Hello, I would like to know more about EgyGulf products and export prices.',
    pack:{},
  },
  fr:{
    navBrands:'Marques', navPrices:'Liste de prix', navCountries:"Marchés d'export", navAbout:'À propos',
    wa:'WhatsApp',
    heroTitle:"Snacks et confiseries d'Égypte, prêts pour l'export",
    heroLead:"Chaque produit est présenté avec son conditionnement, ses données d'expédition et son prix par carton, pour préparer votre commande avant de nous contacter.",
    ctaBrowse:'Voir les produits', ctaPrices:'Liste de prix',
    fSince:'Fondée en', fBrands:'Marques', fProducts:'Produits', fCountries:"Pays d'export",
    brandsTitle:'Nos marques', brandsSub:'Choisissez une marque pour voir ses produits, ses saveurs et ses prix.',
    catAll:'Tout', snacks:'Snacks et chips', lollipops:'Sucettes', candy:'Bonbons et chewing-gum',
    products:'produits', product1:'produit', from:'À partir de', perCarton:'/ carton', flavours:'saveurs', packs:'conditionnements',
    askPrice:'Prix sur demande', allBrands:'Toutes les marques',
    plTitle:'Liste de prix', plNote:'Tous les prix sont en dollars américains par carton. Sélectionnez un produit pour voir ses détails.',
    plSearch:'Rechercher un produit ou une marque', print:'Imprimer la liste', noResults:'Aucun produit ne correspond. Essayez le nom de la marque ou un mot plus court.',
    thProduct:'Produit', thWeight:'Poids', thPack:'Emballage', thNo:'Quantité', thBox:'Dimensions du carton (cm)', thCarton:'Contenu du carton', thCbm:'CBM', thFt:'Cartons / 40 pieds', thPrice:'Prix du carton',
    ctryTitle:"Marchés d'export", ctrySub:'Nos produits sont vendus dans {n} pays, et d’autres arrivent bientôt.', soon:'bientôt', countriesN:'pays',
    gulf:'Golfe et Moyen-Orient', africa:'Afrique', europe:'Europe', americas:'Amériques', asia:'Asie',
    aboutTitle:'À propos d’EgyGulf',
    aboutText:"EgyGulf a été fondée en 2001 sous le nom de Delta Foods Industries, avant de devenir la société égypto-golfe (EgyGulf). L'entreprise est un acteur majeur de la production de snacks et de confiseries sèches, entièrement emballés de façon automatique. Elle dispose de succursales dans toute l'Égypte et exporte vers plus de {n} pays. EgyGulf a lancé les premiers snacks sains cuits au four en Égypte.",
    missionTitle:'Notre mission', missionText:'Offrir une gamme variée de crackers et de confiseries de haute qualité, avec des expériences gustatives pour tous les goûts, dans le respect des plus hautes normes de qualité et de nutrition.',
    visionTitle:'Notre vision', visionText:"Devenir un leader mondial de l'industrie alimentaire, faire référence en matière d'innovation dans les snacks et les confiseries, et inspirer un mode de vie plus sain et plus gourmand grâce à nos produits.",
    certsTitle:'Certifications', certified:'Certifié',
    ctTitle:'Besoin d’un devis ou d’échantillons ?', ctDesc:"Scannez le code ou écrivez-nous sur WhatsApp. Notre équipe export vous répondra avec les prix et les délais d'expédition.", ctBtn:'Écrire sur WhatsApp',
    footTxt:'EgyGulf Foods — Delta Foods Industries, depuis 2001',
    mCartonPrice:'Prix du carton', mContainer:'Conteneur 40 pieds complet :', mCartons:'cartons', mApprox:'≈',
    mQuote:'Demander un devis', mFlavours:'Saveurs disponibles', mSpecs:"Conditionnement et expédition", mPick:'Sélectionnez un conditionnement dans le tableau', close:'Fermer',
    waMsg:'Bonjour, je souhaite un devis pour {p} ({b}) — {pack}.', waGeneral:"Bonjour, je souhaite en savoir plus sur les produits EgyGulf et les prix à l'export.",
    pack:{Bag:'Sachet',Bags:'Sachet',BAG:'Sachet',Jar:'Bocal',Box:'Boîte',Tree:'Arbre',Car:'Voiture',Piece:'Pièce'},
    packN:{Bag:'sachets',Jar:'bocaux',Box:'boîtes',Tree:'arbres',Piece:'pièces'},
  }
};

Object.assign(TR.ar, {"navInvoices": "الفواتير", "navUsers": "المستخدمين", "login": "دخول", "logout": "تسجيل الخروج", "loggedOut": "خرجت من حسابك.", "loginTitle": "تسجيل الدخول", "loginSub": "للموظفين بس، علشان الفواتير وعروض الأسعار.", "username": "اسم المستخدم", "password": "كلمة المرور", "loginBtn": "دخول", "loginErr": "اسم المستخدم أو كلمة المرور غلط.", "loginTooMany": "محاولات كتير غلط. استنى شوية وجرّب تاني.", "loginDisabled": "الحساب ده موقوف. كلّم الأدمن.", "loginNoProfile": "الحساب ده مش متسجل في السيستم. كلّم الأدمن.", "errLoad": "مقدرناش نحمّل بيانات حسابك. جرّب تاني.", "errPerm": "مش مسموحلك تعمل ده.", "errOffline": "مفيش اتصال بالإنترنت. جرّب تاني.", "errGeneric": "حصلت مشكلة ({m}). جرّب تاني.", "loading": "جاري التحميل…", "changePw": "تغيير كلمة المرور", "currentPw": "كلمة المرور الحالية", "newPw": "كلمة المرور الجديدة", "pwRule": "6 حروف أو أرقام على الأقل.", "pwWrong": "كلمة المرور الحالية غلط.", "pwChanged": "اتغيرت كلمة المرور.", "cancel": "إلغاء", "invTitle": "الفواتير", "invSubUser": "الفواتير اللي إنت عملتها.", "invSubAdmin": "كل الفواتير من كل المستخدمين.", "newInvoice": "فاتورة جديدة", "invSearch": "ابحث برقم الفاتورة أو العميل أو البلد", "thNumber": "رقم الفاتورة", "thDate": "التاريخ", "thCustomer": "العميل", "thCountry": "البلد", "thTotal": "الإجمالي", "thBy": "عملها", "thUpdated": "آخر تعديل", "duplicate": "نسخ", "del": "حذف", "confirmDel": "تحذف الفاتورة {n}؟ مش هتقدر ترجّعها.", "deleted": "اتحذفت الفاتورة.", "noInvoices": "لسه مفيش فواتير. ابدأ بأول فاتورة.", "allUsers": "كل المستخدمين", "invCount": "فاتورة", "dupDone": "نسخة من {n}. عدّل واحفظ علشان تاخد رقم جديد.", "notFound": "الفاتورة دي مش موجودة أو مش مسموحلك تشوفها.", "backToList": "كل الفواتير", "save": "حفظ", "saving": "جاري الحفظ…", "saved": "اتحفظ.", "savedAs": "اتحفظت الفاتورة برقم {n}.", "numberOnSave": "الرقم بيتحدد لما تحفظ", "unsavedShort": "مش محفوظ", "unsaved": "فيه تعديلات مش محفوظة. تخرج من غير ما تحفظ؟", "printInv": "طباعة", "pdf": "تحميل PDF", "generating": "جاري التجهيز…", "pdfFail": "مقدرناش نعمل الـ PDF. استخدم طباعة ← حفظ كـ PDF.", "tabForm": "البيانات", "tabPreview": "المعاينة", "createdBy": "عملها", "secDetails": "بيانات الفاتورة", "secCustomer": "بيانات العميل", "secItems": "المنتجات", "f_invDate": "تاريخ الفاتورة", "f_portLoad": "نقطة الشحن", "f_port": "نقطة الوصول", "f_company": "اسم الشركة", "f_country": "البلد", "f_email": "الإيميل", "f_phone": "الموبايل", "f_address": "العنوان", "f_website": "الموقع", "f_notes": "ملاحظات", "f_disc": "نسبة الخصم %", "notesPh": "تعبئة خاصة، اعتماد مستندي…", "addRow": "+ منتج", "pickProduct": "اختار من الكتالوج…", "productName": "اسم المنتج", "packSize": "حجم العبوة", "upc": "عدد / كرتونة", "qty": "الكراتين", "priceCtn": "سعر الكرتونة", "addFlavour": "+ نكهة", "applyDisc": "+ عليه خصم", "onDisc": "عليه خصم ✓", "subtotal": "المجموع", "discount": "الخصم", "total": "الإجمالي", "needItem": "ضيف منتج واحد على الأقل قبل الحفظ.", "confirmRmLine": "تشيل المنتج ده من الفاتورة؟", "usersTitle": "المستخدمين", "usersSub": "ضيف موظفين وحدد صلاحياتهم.", "addUser": "إضافة مستخدم", "displayName": "الاسم", "role": "الصلاحية", "roleUser": "مستخدم", "roleAdmin": "أدمن", "status": "الحالة", "active": "نشط", "disabled": "موقوف", "disable": "إيقاف", "enable": "تفعيل", "usernameRule": "حروف إنجليزي صغيرة وأرقام و . _ - (من 3 لـ 20).", "needName": "اكتب اسم المستخدم.", "userCreated": "اتعمل حساب {u}.", "userExists": "اسم المستخدم ده موجود قبل كده.", "you": "(إنت)", "confirmDisable": "توقف حساب {u}؟ مش هيقدر يدخل، وفواتيره هتفضل موجودة.", "usersNote": "الموقوف مش بيقدر يدخل ولا يشوف أي فاتورة، وفواتيره بتفضل ظاهرة للأدمن. المستخدم يقدر يغيّر كلمة المرور بتاعته من القايمة اللي فوق."});
Object.assign(TR.en, {"navInvoices": "Invoices", "navUsers": "Users", "login": "Sign in", "logout": "Sign out", "loggedOut": "You are signed out.", "loginTitle": "Sign in", "loginSub": "Staff only — invoices and quotations.", "username": "Username", "password": "Password", "loginBtn": "Sign in", "loginErr": "Wrong username or password.", "loginTooMany": "Too many failed attempts. Wait a little and try again.", "loginDisabled": "This account is disabled. Contact the admin.", "loginNoProfile": "This account is not registered in the system. Contact the admin.", "errLoad": "Could not load your account. Try again.", "errPerm": "You are not allowed to do that.", "errOffline": "No internet connection. Try again.", "errGeneric": "Something went wrong ({m}). Try again.", "loading": "Loading…", "changePw": "Change password", "currentPw": "Current password", "newPw": "New password", "pwRule": "At least 6 characters.", "pwWrong": "Current password is wrong.", "pwChanged": "Password changed.", "cancel": "Cancel", "invTitle": "Invoices", "invSubUser": "The invoices you created.", "invSubAdmin": "All invoices from all users.", "newInvoice": "New invoice", "invSearch": "Search by number, customer or country", "thNumber": "Invoice no.", "thDate": "Date", "thCustomer": "Customer", "thCountry": "Country", "thTotal": "Total", "thBy": "Created by", "thUpdated": "Last edited", "duplicate": "Duplicate", "del": "Delete", "confirmDel": "Delete invoice {n}? This cannot be undone.", "deleted": "Invoice deleted.", "noInvoices": "No invoices yet. Create the first one.", "allUsers": "All users", "invCount": "invoices", "dupDone": "Copy of {n}. Edit and save to get a new number.", "notFound": "This invoice does not exist or you cannot open it.", "backToList": "All invoices", "save": "Save", "saving": "Saving…", "saved": "Saved.", "savedAs": "Invoice saved as {n}.", "numberOnSave": "Number is assigned when you save", "unsavedShort": "Unsaved", "unsaved": "You have unsaved changes. Leave without saving?", "printInv": "Print", "pdf": "Download PDF", "generating": "Preparing…", "pdfFail": "Could not create the PDF. Use Print → Save as PDF.", "tabForm": "Details", "tabPreview": "Preview", "createdBy": "Created by", "secDetails": "Invoice details", "secCustomer": "Customer", "secItems": "Products", "f_invDate": "Invoice date", "f_portLoad": "Loading point", "f_port": "Discharge point", "f_company": "Company name", "f_country": "Country", "f_email": "Email", "f_phone": "Phone", "f_address": "Address", "f_website": "Website", "f_notes": "Notes", "f_disc": "Discount %", "notesPh": "Special packing, LC…", "addRow": "+ Product", "pickProduct": "Pick from catalog…", "productName": "Product name", "packSize": "Pack size", "upc": "Units / carton", "qty": "Cartons", "priceCtn": "Carton price", "addFlavour": "+ Flavour", "applyDisc": "+ Apply discount", "onDisc": "Discounted ✓", "subtotal": "Subtotal", "discount": "Discount", "total": "Total", "needItem": "Add at least one product before saving.", "confirmRmLine": "Remove this product from the invoice?", "usersTitle": "Users", "usersSub": "Add staff and set their access.", "addUser": "Add user", "displayName": "Name", "role": "Role", "roleUser": "User", "roleAdmin": "Admin", "status": "Status", "active": "Active", "disabled": "Disabled", "disable": "Disable", "enable": "Enable", "usernameRule": "Lowercase English letters, numbers and . _ - (3–20).", "needName": "Enter a name.", "userCreated": "Account {u} created.", "userExists": "That username already exists.", "you": "(you)", "confirmDisable": "Disable {u}? They will not be able to sign in; their invoices stay.", "usersNote": "Disabled users cannot sign in or see any invoice; their invoices stay visible to admins. Users can change their own password from the menu at the top."});

Object.assign(TR.ar, {"secShip": "الحاوية", "c20": "حاوية 20 قدم", "c40": "حاوية 40 قدم", "cNone": "بدون حاوية", "cCount": "عدد الحاويات", "cMargin": "هامش أمان %", "cNoneNote": "الفاتورة دي مش هتتحسب على حاوية (عينات أو شحنة جزئية).", "cCountReq": "اكتب عدد الحاويات.", "cEmpty": "حدد الكميات علشان تشوف هتملا {n} × {c} بنسبة كام.", "cOver": "الكمية أكبر من الحاويات بـ {p}", "cOverSub": "محتاج {k} حاوية {c}، أو قلّل الكميات.", "cFull": "الحاويات مليانة ✓", "cFits": "الكمية داخلة في الحاويات", "cFree": "فاضل حوالي {p} ({x} حاوية).", "cUnknown": "فيه منتجات من غير سعة كرتونة، ومش داخلة في الحساب. اكتب مقاس الكرتونة أو عدد الكراتين في الـ 40 قدم.", "cFill": "نسبة الإشغال", "cUsed": "{u} من {n} حاوية", "cFitDown": "قلّل الكميات علشان تساوي الحاويات بالظبط", "cFitUp": "كمّل الكميات لحد ما الحاويات تتملي", "cNoData": "مش محسوب: مفيش مقاس أو سعة", "srcList": "من قائمة الأسعار", "srcCalc": "محسوب من المقاس", "ofContainer": "من حاوية", "perC": "{n} كرتونة / {c}", "cFillLine": "+ {n} كرتونة تملا الباقي", "cFitted": "اتظبطت الكميات على الحاويات.", "cSaveOver": "الكميات بتملا {p} من الحاويات، يعني أكتر من اللي هتشيله. تحفظ برضو؟", "boxSize": "المقاس (سم)", "cap40": "كراتين/40 قدم", "thLoad": "الحاوية", "c20s": "20 قدم", "c40s": "40 قدم"});
Object.assign(TR.en, {"secShip": "Container", "c20": "20' container", "c40": "40' container", "cNone": "No container", "cCount": "Containers", "cMargin": "Safety margin %", "cNoneNote": "This invoice is not planned on a container (samples or LCL).", "cCountReq": "Enter the number of containers.", "cEmpty": "Enter quantities to see how much of {n} × {c} they fill.", "cOver": "Quantities exceed the containers by {p}", "cOverSub": "You need {k} × {c}, or reduce quantities.", "cFull": "Containers are full ✓", "cFits": "Quantities fit in the containers", "cFree": "About {p} still free ({x} container).", "cUnknown": "Some products have no carton size or capacity, so they are not counted. Add the carton size or cartons per 40ft.", "cFill": "Load", "cUsed": "{u} of {n} containers", "cFitDown": "Reduce quantities to fit the containers exactly", "cFitUp": "Top up quantities to fill the containers", "cNoData": "Not counted: no size or capacity", "srcList": "from price list", "srcCalc": "calculated from size", "ofContainer": "of a container", "perC": "{n} cartons / {c}", "cFillLine": "+ {n} cartons to fill the rest", "cFitted": "Quantities adjusted to the containers.", "cSaveOver": "Quantities load {p} of the containers — more than they hold. Save anyway?", "boxSize": "Size (cm)", "cap40": "Ctns/40ft", "thLoad": "Container", "c20s": "20ft", "c40s": "40ft"});
Object.assign(TR.ar, {"loginDomain": "الدومين ده مش متضاف في Firebase. ضيفه من Authentication ← Settings ← Authorized domains.", "loginDisabledMethod": "تسجيل الدخول بالإيميل مش متفعّل في Firebase. فعّل Email/Password من Authentication ← Sign-in method.", "loginConfig": "إعدادات Firebase في firebase-config.js مش صح."});
Object.assign(TR.en, {"loginDomain": "This domain is not authorized in Firebase. Add it under Authentication → Settings → Authorized domains.", "loginDisabledMethod": "Email/Password sign-in is not enabled in Firebase (Authentication → Sign-in method).", "loginConfig": "The Firebase settings in firebase-config.js are wrong."});
Object.assign(TR.ar, {"secTeam": "السيلز والسوشيال", "internalOnly": "للسيستم بس، مش بيتطبع", "f_salesName": "اسم السيلز", "f_socialName": "اسم السوشيال", "thTeam": "السيلز / السوشيال", "invSearch": "ابحث برقم الفاتورة أو العميل أو البلد أو السيلز"});
Object.assign(TR.en, {"secTeam": "Sales & social", "internalOnly": "Internal — not printed", "f_salesName": "Sales name", "f_socialName": "Social name", "thTeam": "Sales / social", "invSearch": "Search by number, customer, country or sales"});
let lang = 'ar';
try{ const s = localStorage.getItem('eg-lang'); if(s==='en'||s==='ar'||s==='fr') lang = s; }catch(e){}
export const t = (k, vars={}) => String(TR[lang][k] ?? TR.en[k] ?? TR.ar[k] ?? k).replace(/\{(\w+)\}/g,(_,v)=>vars[v] ?? '');
export const getLang = () => lang;

/* helpers */
export const money = v => v==null ? null : '$' + (v%1 ? v.toFixed(2) : String(v));
const int = s => Number(String(s).replace(/,/g,''));
const fmt = n => n.toLocaleString('en-US');
const pName = p => lang==='ar' ? p.name_ar : lang==='fr' ? (p.name_fr||p.name) : p.name;
const bTag = b => lang==='ar' ? b.tagline_ar : lang==='fr' ? (b.tagline_fr||b.tagline) : b.tagline;
const packWord = w => (TR[lang].pack[w] || w);
function noLabel(no){
  const m = String(no).match(/^(Bag|Piece|Jar|Box|Tree)\s+(\d+)$/);
  if(!m) return no;
  if(lang==='ar') return `${m[2]} ${packWord(m[1])}`;
  if(lang==='fr') return `${m[2]} ${(TR.fr.packN[m[1]]||m[1])}`;
  return no;
}
const minPrice = rows => { const ps = rows.map(r=>r.price).filter(v=>v!=null); return ps.length ? Math.min(...ps) : null; };
const brandMin = b => minPrice(b.products.flatMap(p=>p.rows));
const waLink = msg => `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
export const esc = s => String(s ?? '').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const totalProducts = BRANDS.reduce((s,b)=>s+b.products.length,0);

/* state + routing */
const state = { cat:'all', q:'', plCat:'all' };
export function route(){
  const parts = location.hash.replace(/^#\/?/,'').split('/').filter(Boolean);
  return { view: parts[0] || 'home', a: parts[1], b: parts[2], c: parts[3] };
}
export function go(hash){ if(location.hash === hash) render(); else location.hash = hash; }

function renderChrome(){
  document.documentElement.lang = lang;
  document.documentElement.dir = lang==='ar' ? 'rtl' : 'ltr';
  const r = route();
  const items = [['brands','navBrands'],['prices','navPrices'],['countries','navCountries'],['about','navAbout']];
  if(isIn()){ items.push(['invoices','navInvoices']); if(isAdmin()) items.push(['users','navUsers']); }
  const cur = r.view==='brand' ? 'brands' : r.view==='invoice' ? 'invoices' : r.view;
  renderAccount();
  document.getElementById('nav').innerHTML = items.map(([id,k]) =>
    `<button type="button" data-go="${id}" ${cur===id?'aria-current="page"':''}>${t(k)}</button>`).join('');
  document.querySelectorAll('[data-lang]').forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.lang===lang)));
  document.getElementById('waHeadLbl').textContent = t('wa');
  document.getElementById('waHead').href = waLink(t('waGeneral'));
  document.getElementById('ctTitle').textContent = t('ctTitle');
  document.getElementById('ctDesc').textContent = t('ctDesc');
  document.getElementById('ctBtn').textContent = t('ctBtn');
  document.getElementById('ctBtn').href = waLink(t('waGeneral'));
  document.getElementById('footTxt').textContent = t('footTxt');
  document.getElementById('footWa').textContent = t('wa') + ':';
}

/* ───── views ───── */
function brandCard(b){
  const logo = b.logo ? img(b.logo) : img(b.products[0].thumb);
  const mp = brandMin(b);
  return `<button type="button" class="brand-card" data-go="brand/${b.id}" style="--brand:${b.color}">
    <div class="logo-well ${b.logoDark?'dark':''}"><img src="${logo}" alt="" loading="lazy"></div>
    <div class="body">
      <h3>${esc(b.name)}</h3>
      <span class="tag">${esc(bTag(b))}</span>
      <div class="meta"><span>${b.products.length} ${b.products.length>1?t('products'):t('product1')}</span>
      ${mp!=null ? `<span>${t('from')} <strong class="num">${money(mp)}</strong></span>` : `<strong>${t('askPrice')}</strong>`}</div>
    </div></button>`;
}
function tabs(cur, attr){
  return `<div class="tabs" role="group">${['all','snacks','lollipops','candy'].map(c =>
    `<button type="button" ${attr}="${c}" aria-pressed="${cur===c}">${t(c==='all'?'catAll':c)}</button>`).join('')}</div>`;
}

function viewHome(){
  const hero = `
  <section class="hero">
    <div class="wrap">
      <div class="hero-frame">
        <div class="hero-mark"></div>
        <div>
          <h1>${t('heroTitle')}</h1>
          <p class="hero-lead">${t('heroLead')}</p>
          <div class="hero-ctas">
            <button type="button" class="btn btn-saffron" data-go="brands">${t('ctaBrowse')}</button>
            <button type="button" class="btn btn-ghost" data-go="prices">${t('ctaPrices')}</button>
          </div>
          <div class="certs"><span>Halal</span><span>FDA</span><span>ISO 22000</span><span>ISO 45001</span><span>ISO 9001</span><span>HACCP</span></div>
        </div>
        <div class="shelf" aria-hidden="true">
          <img src="${img('hero_popcorn')}" alt="">
          <img src="${img('hero_mojo_jar')}" alt="">
          <img src="${img('hero_crazycrinkle')}" alt="">
        </div>
      </div>
    </div>
  </section>
  <section class="facts"><div class="wrap facts-row">
    <div class="fact"><b class="num">2001</b><span>${t('fSince')}</span></div>
    <div class="fact"><b class="num">${BRANDS.length}</b><span>${t('fBrands')}</span></div>
    <div class="fact"><b class="num">${totalProducts}</b><span>${t('fProducts')}</span></div>
    <div class="fact"><b class="num">${ACTIVE_COUNTRIES}</b><span>${t('fCountries')}</span></div>
  </div></section>`;
  return hero + brandsSection() + countriesSection();
}

function brandsSection(){
  let grid = '';
  if(state.cat==='all'){
    for(const c of ['snacks','lollipops','candy']){
      const list = BRANDS.filter(b=>b.cat===c);
      const n = list.reduce((s,b)=>s+b.products.length,0);
      grid += `<h3 class="group-title">${t(c)} <small>${n} ${t('products')}</small></h3><div class="brand-grid">${list.map(brandCard).join('')}</div>`;
    }
  } else {
    grid = `<div class="brand-grid" style="margin-top:8px">${BRANDS.filter(b=>b.cat===state.cat).map(brandCard).join('')}</div>`;
  }
  return `<section class="section" id="brands"><div class="wrap">
    <div class="section-head"><div><h2>${t('brandsTitle')}</h2><p>${t('brandsSub')}</p></div>${tabs(state.cat,'data-cat')}</div>
    ${grid}</div></section>`;
}

function countriesSection(){
  return `<section class="section countries" id="countries"><div class="wrap">
    <div class="section-head"><div><h2>${t('ctryTitle')}</h2><p>${t('ctrySub',{n:ACTIVE_COUNTRIES})}</p></div></div>
    <div class="region-grid">${COUNTRIES.map(g=>{
      const n = g.list.filter(c=>!c[2]).length;
      return `<div class="region"><h3>${t(g.r)} <span class="num">${n}</span></h3><ul>${g.list.map(c=>
        `<li class="${c[2]?'soon':''}" ${c[2]?`data-soon="${t('soon')}"`:''}>${lang==='ar'?c[0]:lang==='fr'?(COUNTRY_FR[c[1]]||c[1]):c[1]}</li>`).join('')}</ul></div>`;
    }).join('')}</div></div></section>`;
}

function viewBrand(id){
  const b = BRANDS.find(x=>x.id===id);
  if(!b) return viewHome();
  const mp = brandMin(b);
  return `<section class="section" style="padding-top:0"><div class="wrap">
    <div class="crumbs"><button type="button" data-go="brands">${t('allBrands')}</button><span aria-hidden="true">/</span><span>${esc(b.name)}</span></div>
    <div class="brand-banner" style="--brand:${b.color}">
      <div class="logo-box ${b.logoDark?'dark':''}"><img src="${b.logo?img(b.logo):img(b.products[0].thumb)}" alt=""></div>
      <div><h1>${esc(b.name)}</h1><p>${esc(bTag(b))} — ${b.products.length} ${b.products.length>1?t('products'):t('product1')}</p></div>
      ${mp!=null?`<div class="from">${t('from')}<b class="num">${money(mp)}</b>${t('perCarton')}</div>`:''}
    </div>
    <div class="product-grid">${b.products.map(p=>{
      const pm = minPrice(p.rows);
      return `<button type="button" class="product-card" data-go="brand/${b.id}/${p.id}">
        <div class="shot"><img src="${img(p.thumb)}" alt="" loading="lazy"></div>
        <div class="body"><h3>${esc(pName(p))}</h3>
          <span class="sub">${p.flavours.length} ${t('flavours')}${p.rows.length>1?` — ${p.rows.length} ${t('packs')}`:''}</span>
          <div class="price-chip">${pm!=null?`<span>${p.rows.length>1?t('from'):t('mCartonPrice')}</span><b class="num">${money(pm)}</b>`:`<span class="ask">${t('askPrice')}</span>`}</div>
        </div></button>`;
    }).join('')}</div>
  </div></section>`;
}

function plRows(){
  const q = state.q.trim().toLowerCase();
  let html = '', count = 0;
  for(const b of BRANDS){
    if(state.plCat!=='all' && b.cat!==state.plCat) continue;
    const prods = b.products.filter(p => !q || [b.name,p.name,p.name_ar,p.name_fr,b.tagline_ar,b.tagline_fr].join(' ').toLowerCase().includes(q));
    if(!prods.length) continue;
    html += `<tr class="brand-row"><td colspan="7">${esc(b.name)}<small>${esc(bTag(b))}</small></td></tr>`;
    for(const p of prods){
      p.rows.forEach((r,i)=>{
        count++;
        html += `<tr class="item" data-go="brand/${b.id}/${p.id}/${i}" tabindex="0">
          <td><div class="pcell">${i===0?`<img src="${img(p.thumb)}" alt="" loading="lazy"><span>${esc(pName(p))}</span>`:`<span class="repeat">${esc(pName(p))}</span>`}</div></td>
          <td><span class="num">${r.weight}</span></td>
          <td>${noLabel(r.no)}</td>
          <td><span class="num">${r.carton}</span></td>
          <td><span class="num">${r.cbm}</span></td>
          <td><span class="num">${r.ft}</span></td>
          <td class="price end">${r.price!=null?`<span class="num">${money(r.price)}</span>`:`<span class="ask">${t('askPrice')}</span>`}</td>
        </tr>`;
      });
    }
  }
  return count ? html : `<tr><td colspan="7" class="empty">${t('noResults')}</td></tr>`;
}
function viewPrices(){
  return `<section class="section"><div class="wrap">
    <div class="section-head"><div><h2>${t('plTitle')}</h2><p>${t('plNote')}</p></div>${tabs(state.plCat,'data-plcat')}</div>
    <div class="pl-tools">
      <label class="search"><span class="sr">${t('plSearch')}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input id="plq" type="search" placeholder="${t('plSearch')}" value="${esc(state.q)}"></label>
      <button type="button" class="print-btn" id="printBtn">${t('print')}</button>
    </div>
    <div class="table-wrap"><table class="pl-table">
      <thead><tr><th>${t('thProduct')}</th><th>${t('thWeight')}</th><th>${t('thNo')}</th><th>${t('thCarton')}</th><th>${t('thCbm')}</th><th>${t('thFt')}</th><th class="end">${t('thPrice')}</th></tr></thead>
      <tbody id="plBody">${plRows()}</tbody></table></div>
  </div></section>`;
}

function viewAbout(){
  return `<section class="section" style="padding-top:0"><div class="wrap">
    <div class="about-hero">
      <div><h1>${t('aboutTitle')}</h1><p>${t('aboutText',{n:ACTIVE_COUNTRIES})}</p></div>
      <div class="about-shots" aria-hidden="true">
        <img src="${img('hero_firefingers')}" alt=""><img src="${img('hn_mango_single')}" alt=""><img src="${img('hero_mojo_lolli')}" alt="">
      </div>
    </div>
    <div class="mv">
      <article><h2>${t('missionTitle')}</h2><p>${t('missionText')}</p></article>
      <article><h2>${t('visionTitle')}</h2><p>${t('visionText')}</p></article>
    </div>
    <h2 class="group-title" style="margin-top:56px">${t('certsTitle')}</h2>
    <div class="cert-row">${['Halal','FDA','ISO 22000','ISO 45001','ISO 9001','HACCP'].map(c=>`<div><b>${c}</b><span>${t('certified')}</span></div>`).join('')}</div>
  </div></section>` + countriesSection();
}

/* ───── modal ───── */
let lastFocus = null, cur = null;
function specRows(p, sel){
  return p.rows.map((r,i)=>`<tr class="row" data-row="${i}" tabindex="0" aria-selected="${i===sel}">
    <td><span class="num">${r.weight}</span></td><td>${packWord(r.pack)}</td><td>${noLabel(r.no)}</td>
    <td><span class="num">${r.box}</span></td><td><span class="num">${r.carton}</span></td>
    <td><span class="num">${r.cbm}</span></td><td><span class="num">${r.ft}</span></td>
    <td class="price end">${r.price!=null?`<span class="num">${money(r.price)}</span>`:`<span class="ask">${t('askPrice')}</span>`}</td></tr>`).join('');
}
function tagCard(b, p, i){
  const r = p.rows[i];
  const packTxt = `${r.weight} — ${r.carton}`;
  const cartons = int(r.ft);
  const cont = (r.price!=null && cartons) ? `${t('mContainer')} <b class="num">${fmt(cartons)}</b> ${t('mCartons')} ${t('mApprox')} <b class="num">${'$'+fmt(Math.round(r.price*cartons))}</b>`
             : (cartons ? `${t('mContainer')} <b class="num">${fmt(cartons)}</b> ${t('mCartons')}` : '');
  return `<div class="tag-main">
      <div><div class="lbl">${t('mCartonPrice')}</div>
        ${r.price!=null?`<div class="big num">${money(r.price)}</div>`:`<div class="big ask">${t('askPrice')}</div>`}</div>
      <div class="pack"><b class="num">${r.weight}</b><span class="num">${r.carton}</span></div>
    </div>
    <div class="tag-foot"><span class="cont">${cont}</span>
      <a class="btn btn-saffron" target="_blank" rel="noopener" href="${waLink(t('waMsg',{p:pName(p),b:b.name,pack:packTxt}))}">${t('mQuote')}</a></div>`;
}
function openProduct(bid, pid, rowIdx){
  const b = BRANDS.find(x=>x.id===bid); const p = b && b.products.find(x=>x.id===pid);
  if(!p) return;
  let sel = Number.isInteger(+rowIdx) && p.rows[+rowIdx] ? +rowIdx : 0;
  cur = {b,p};
  const m = document.getElementById('modal');
  m.innerHTML = `
    <button type="button" class="close" id="mClose" aria-label="${t('close')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
    <div class="m-top">
      <div class="m-shot"><img src="${img(p.thumb)}" alt="${esc(pName(p))}"></div>
      <div class="m-info">
        <button type="button" class="m-brand" data-go="brand/${b.id}">${esc(b.name)}</button>
        <h2 id="mTitle">${esc(pName(p))}</h2>
        ${lang!=='en'?`<div class="en-name">${esc(p.name)}</div>`:''}
        <div class="chips">${p.flavours.map(f=>`<span>${esc(f)}</span>`).join('')}</div>
        <div class="tag-card" id="tagCard">${tagCard(b,p,sel)}</div>
      </div>
    </div>
    <div class="m-body">
      <h3>${t('mFlavours')}</h3>
      <div class="flav-img"><img src="${img(p.flav)}" alt="" loading="lazy"></div>
      <h3>${t('mSpecs')} ${p.rows.length>1?`<small>${t('mPick')}</small>`:''}</h3>
      <div class="table-wrap"><table class="spec">
        <thead><tr><th>${t('thWeight')}</th><th>${t('thPack')}</th><th>${t('thNo')}</th><th>${t('thBox')}</th><th>${t('thCarton')}</th><th>${t('thCbm')}</th><th>${t('thFt')}</th><th class="end">${t('thPrice')}</th></tr></thead>
        <tbody id="specBody">${specRows(p, sel)}</tbody></table></div>
    </div>`;
  const ov = document.getElementById('overlay');
  if(!ov.classList.contains('open')) lastFocus = document.activeElement;
  ov.classList.add('open'); ov.setAttribute('aria-hidden','false');
  document.body.style.overflow = 'hidden';
  document.getElementById('mClose').focus({preventScroll:true});
  ov.scrollTop = 0;
}
function selectRow(i){
  if(!cur) return;
  document.getElementById('tagCard').innerHTML = tagCard(cur.b, cur.p, i);
  document.querySelectorAll('#specBody tr.row').forEach(tr=>tr.setAttribute('aria-selected', String(+tr.dataset.row===i)));
}
function closeModal(){
  const ov = document.getElementById('overlay');
  if(!ov.classList.contains('open')) return;
  ov.classList.remove('open'); ov.setAttribute('aria-hidden','true');
  document.body.style.overflow = ''; cur = null;
  const r = route();
  if(r.view==='brand' && r.b){ history.replaceState(null,'',`#/brand/${r.a}`); }
  if(lastFocus && document.contains(lastFocus)) lastFocus.focus({preventScroll:true});
}

/* ───── render ───── */
let lastView = null;
const APP_VIEWS = ['login','invoices','invoice','users'];
function render(){
  renderChrome();
  const r = route();
  const app = document.getElementById('app');
  document.body.dataset.view = r.view;
  document.body.classList.toggle('in-app', APP_VIEWS.includes(r.view));
  let key = r.view;
  if(APP_VIEWS.includes(r.view)){
    closeModal();
    key = r.view + '/' + (r.a||'');
    if(lastView!==key){
      app.innerHTML = r.view==='login' ? viewLogin() : r.view==='invoices' ? viewInvoices() : r.view==='users' ? viewUsers() : viewInvoiceEditor(r.a||'new');
      window.scrollTo(0,0);
      mountInvoiceView(r);
    }
    lastView = key; return;
  }
  if(r.view==='brand'){
    key = 'brand/'+r.a;
    if(lastView!==key) app.innerHTML = viewBrand(r.a);
    if(r.b) openProduct(r.a, r.b, r.c); else closeModal();
  } else {
    closeModal();
    const homeLike = ['home','brands','countries'].includes(r.view);
    const k2 = homeLike ? 'home' : r.view;
    if(lastView!==k2) app.innerHTML = r.view==='prices' ? viewPrices() : r.view==='about' ? viewAbout() : viewHome();
    key = k2;
    if(lastView!==null || homeLike){
      const target = r.view==='brands' ? document.getElementById('brands') : r.view==='countries' ? document.getElementById('countries') : null;
      if(target) requestAnimationFrame(()=>target.scrollIntoView({behavior: lastView===key ? 'smooth':'auto'}));
      else if(lastView!==key) window.scrollTo(0,0);
    }
  }
  lastView = key;
}
function rerender(){ lastView = null; const y = scrollY; render(); window.scrollTo(0,y); }

/* ───── events ───── */
document.addEventListener('click', e=>{
  if(invoiceClick(e)) return;
  const g = e.target.closest('[data-go]');
  if(g){ e.preventDefault(); go('#/'+g.dataset.go); return; }
  const c = e.target.closest('[data-cat]');
  if(c){ state.cat = c.dataset.cat; const y=scrollY; document.getElementById('brands').outerHTML = brandsSection(); window.scrollTo(0,y); return; }
  const pc = e.target.closest('[data-plcat]');
  if(pc){ state.plCat = pc.dataset.plcat; document.querySelectorAll('[data-plcat]').forEach(b=>b.setAttribute('aria-pressed', String(b===pc))); document.getElementById('plBody').innerHTML = plRows(); return; }
  const row = e.target.closest('#specBody tr.row');
  if(row){ selectRow(+row.dataset.row); return; }
  if(e.target.closest('#mClose') || e.target.id==='overlay'){ closeModal(); return; }
  if(e.target.closest('#printBtn')){ window.print(); return; }
  const lb = e.target.closest('[data-lang]');
  if(lb){
    if(lb.dataset.lang===lang) return;
    lang = lb.dataset.lang;
    try{ localStorage.setItem('eg-lang', lang); }catch(err){}
    const open = cur; rerender();
    if(open && !route().b) openProduct(open.b.id, open.p.id, 0);
  }
});
document.addEventListener('keydown', e=>{
  if(invoiceKey(e)) return;
  if(e.key==='Escape') closeModal();
  if(e.key==='Enter' || e.key===' '){
    const row = e.target.closest && e.target.closest('#specBody tr.row');
    if(row){ e.preventDefault(); selectRow(+row.dataset.row); return; }
    const it = e.target.closest && e.target.closest('tr.item[data-go]');
    if(it){ e.preventDefault(); go('#/'+it.dataset.go); }
  }
  if(e.key==='Tab' && document.getElementById('overlay').classList.contains('open')){
    const f = [...document.querySelectorAll('#modal button, #modal a, #modal [tabindex="0"]')];
    if(!f.length) return;
    if(e.shiftKey && document.activeElement===f[0]){ e.preventDefault(); f[f.length-1].focus(); }
    else if(!e.shiftKey && document.activeElement===f[f.length-1]){ e.preventDefault(); f[0].focus(); }
  }
});
document.addEventListener('input', e=>{
  if(invoiceInput(e)) return;
  if(e.target.id==='plq'){ state.q = e.target.value; document.getElementById('plBody').innerHTML = plRows(); }
});
window.addEventListener('hashchange', ()=>{
  if(!confirmLeave(location.hash)){ history.replaceState(null,'',editorHash()); return; }
  render();
});
window.addEventListener('beforeunload', e=>{ if(hasUnsaved()){ e.preventDefault(); e.returnValue=''; } });
document.addEventListener('change', e=>{ invoiceChange(e); });
document.addEventListener('submit', e=>{
  if(invoiceSubmit(e)) return;
  if(e.target.id==='pwForm'){ e.preventDefault(); doChangePw(e.target); }
});

/* ───── account (header) ───── */
function renderAccount(){
  const el = document.getElementById('acct'); if(!el) return;
  if(!auth.ready){ el.innerHTML=''; return; }
  if(!isIn()){
    el.innerHTML = `<button type="button" class="login-btn" data-go="login" title="${t('login')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg><span>${t('login')}</span></button>`;
    return;
  }
  const n = auth.profile.name || auth.profile.username;
  el.innerHTML = `<div class="acct"><button type="button" class="acct-btn" id="acctBtn" aria-haspopup="true" aria-expanded="false">
      <span class="avatar">${esc(n.trim().charAt(0).toUpperCase())}</span><span class="acct-name">${esc(n)}</span>${isAdmin()?`<span class="role-tag">${t('roleAdmin')}</span>`:''}</button>
    <div class="acct-menu" id="acctMenu" hidden>
      <div class="acct-who"><b>${esc(n)}</b><span dir="ltr">@${esc(auth.profile.username)}</span></div>
      <button type="button" data-go="invoices">${t('navInvoices')}</button>
      ${isAdmin()?`<button type="button" data-go="users">${t('navUsers')}</button>`:''}
      <button type="button" id="pwOpen">${t('changePw')}</button>
      <button type="button" id="logoutBtn" class="danger">${t('logout')}</button>
    </div></div>`;
}
function pwDialog(){
  let d = document.getElementById('pwDlg');
  if(!d){ d = document.createElement('dialog'); d.id='pwDlg'; d.className='dlg'; document.body.appendChild(d); }
  d.innerHTML = `<form id="pwForm" novalidate><h3>${t('changePw')}</h3>
    <label class="fld"><span>${t('currentPw')}</span><input name="cur" type="password" required dir="ltr" autocomplete="current-password"></label>
    <label class="fld"><span>${t('newPw')}</span><input name="nw" type="password" required dir="ltr" autocomplete="new-password"><small>${t('pwRule')}</small></label>
    <div id="pwErr"></div>
    <div class="dlg-acts"><button type="button" class="btn btn-line sm" id="pwCancel">${t('cancel')}</button><button class="btn btn-indigo sm" type="submit">${t('save')}</button></div></form>`;
  d.showModal(); d.querySelector('input').focus();
}
async function doChangePw(f){
  const box = document.getElementById('pwErr'); box.innerHTML='';
  try{ await changeOwnPassword(f.cur.value, f.nw.value); document.getElementById('pwDlg').close(); toast(t('pwChanged')); }
  catch(err){ const k = err.code||''; box.innerHTML = `<p class="form-err">${t(k)!==k?t(k):t('errGeneric',{m:k})}</p>`; }
}
document.addEventListener('click', e=>{
  const menu = document.getElementById('acctMenu');
  if(e.target.closest('#acctBtn')){ const open = menu.hidden; menu.hidden = !open; document.getElementById('acctBtn').setAttribute('aria-expanded', String(open)); return; }
  if(menu && !menu.hidden && !e.target.closest('#acctMenu')) menu.hidden = true;
  else if(menu && e.target.closest('#acctMenu [data-go]')) menu.hidden = true;
  if(e.target.closest('#pwOpen')){ menu.hidden = true; pwDialog(); return; }
  if(e.target.closest('#pwCancel')){ document.getElementById('pwDlg').close(); return; }
  if(e.target.closest('#logoutBtn')){
    if(hasUnsaved() && !confirm(t('unsaved'))) return;
    logout().then(()=>{ resetAppState(); toast(t('loggedOut')); go('#/'); });
  }
}, true);

let lastUid = undefined;
initAuth(a=>{
  const uid = a.user ? a.user.uid : null;
  if(uid!==lastUid){ resetAppState(); lastUid = uid; }
  const r = route();
  if(isIn() && r.view==='login'){ go('#/invoices'); return; }
  if(APP_VIEWS.includes(r.view) || lastView===null) rerender(); else renderChrome();
});

document.getElementById('headLogo').src = img('logo_main');
document.getElementById('footLogo').src = img('logo_main');
render();

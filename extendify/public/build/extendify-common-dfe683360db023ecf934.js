"use strict";(globalThis.webpackChunkextendify=globalThis.webpackChunkextendify||[]).push([[857],{4069:(e,t,a)=>{a.d(t,{Tk:()=>n,bu:()=>l});var s=a(6989),i=a.n(s),o=a(6483);const n=async e=>await i()({path:"/wp/v2/plugins",method:"POST",data:{slug:e}}),l=async e=>{const t=await(async e=>{const t=await i()({path:(0,o.addQueryArgs)("/wp/v2/plugins",{search:e})});let a=t?.[0];if(!a)throw new Error("Plugin not found");return a})(e);return await i()({path:`/wp/v2/plugins/${t.plugin}`,method:"POST",data:{status:"active"}})}},1174:(e,t,a)=>{a.d(t,{S:()=>i});var s=a(5736);const i={about:{
// translators: This string represents the title of an "About" page on a website that provides information about the website or organization. Please translate it in a way that fits the standard phrasing for an "About" page in the target language, considering the common usage in websites for that language.
title:(0,s.__)("About","extendify-local"),
// translators: This string represents the slug of an "About" page on a website that provides information about the website or organization. Please translate it in a way that fits a slug for an "About" page in the target language, considering the common usage in websites for that language.
slug:(0,s.__)("about","extendify-local"),alias:["about","about-us","recognition","stats"]},blog:{
// translators: This string represents the title of a "Blog" page on a website that shows recent blog posts. Please translate it in a way that fits the standard phrasing for a "Blog" page in the target language, considering the common usage in websites for that language.
title:(0,s.__)("Blog","extendify-local"),
// translators: This string represents the slug of a "Blog" page on a website that shows recent blog posts. Please translate it in a way that fits a slug for a "Blog" page in the target language, considering the common usage in websites for that language.
slug:(0,s.__)("blog","extendify-local"),alias:["blog","blog-categories","blog-section"]},book:{
// translators: This string represents the title of a "Book" page on a website that is meant for booking something. Please translate it in a way that fits the standard phrasing for a "Book" page in the target language, considering the common usage in websites for that language.
title:(0,s.__)("Book Now","extendify-local"),
// translators: This string represents the slug of a "Book" page on a website that is meant for booking something. Please translate it in a way that fits a slug for a "Book" page in the target language, considering the common usage in websites for that language. Make sure to keep the slug lowercase and url-friendly.
slug:(0,s.__)("book-now","extendify-local"),alias:["book","booking"]},careers:{
// translators: This string represents the title of a "Careers" page on a website that is meant for listing available careers. Please translate it in a way that fits the standard phrasing for a "Careers" page in the target language, considering the common usage in websites for that language.
title:(0,s.__)("Careers","extendify-local"),
// translators: This string represents the slug of a "Careers" page on a website that is meant for listing available careers. Please translate it in a way that fits a slug for a "Careers" page in the target language, considering the common usage in websites for that language. Make sure to keep the slug lowercase and url-friendly.
slug:(0,s.__)("careers","extendify-local"),alias:["careers","career","career-with-opening"]},contact:{
// translators: This string represents the title of a "Contact" page on a website that gives information for visitors on how to contact the website or organization. Please translate it in a way that fits the standard phrasing for a "Contact" page in the target language, considering the common usage in websites for that language.
title:(0,s.__)("Contact","extendify-local"),
// translators: This string represents the slug of a "Contact" page on a website that gives information for visitors on how to contact the website or organization. Please translate it in a way that fits a slug for a "Contact" page in the target language, considering the common usage in websites for that language. Make sure to keep the slug lowercase and url-friendly.
slug:(0,s.__)("contact","extendify-local"),alias:["contact","contact-with-form"]},events:{
// translators: This string represents the title of an "Events" page on a website that lists events of any kind. Please translate it in a way that fits the standard phrasing for an "Events" page in the target language, considering the common usage in websites for that language.
title:(0,s.__)("Events","extendify-local"),
// translators: This string represents the slug of an "Events" page on a website that lists events of any kind. Please translate it in a way that fits a slug for an "Events" page in the target language, considering the common usage in websites for that language. Make sure to keep the slug lowercase and url-friendly.
slug:(0,s.__)("events","extendify-local"),alias:["events","events-section"]},faq:{
// translators: This string represents the title of a "FAQ" page on a website that gives information related to frequently asked questions. Please translate it in a way that fits the standard phrasing for a "FAQ" page in the target language, considering the common usage in websites for that language.
title:(0,s.__)("FAQ","extendify-local"),
// translators: This string represents the slug of a "FAQ" page on a website that gives information related to frequently asked questions. Please translate it in a way that fits a slug for a "FAQ" page in the target language, considering the common usage in websites for that language. Make sure to keep the slug lowercase and url-friendly.
slug:(0,s.__)("faq","extendify-local"),alias:["faq"]},features:{
// translators: This string represents the title of a "Features" page on a website that lists features of a product or service. Please translate it in a way that fits the standard phrasing for a "Features" page in the target language, considering the common usage in websites for that language.
title:(0,s.__)("Features","extendify-local"),
// translators: This string represents the slug of a "Features" page on a website that lists features of a product or service. Please translate it in a way that fits a slug for a "Features" page in the target language, considering the common usage in websites for that language. Make sure to keep the slug lowercase and url-friendly.
slug:(0,s.__)("features","extendify-local"),alias:["features"]},gallery:{
// translators: This string represents the title of a "Gallery" page on a website that shows a collection of images. Please translate it in a way that fits the standard phrasing for a "Gallery" page in the target language, considering the common usage in websites for that language.
title:(0,s.__)("Gallery","extendify-local"),
// translators: This string represents the slug of a "Gallery" page on a website that shows a collection of images. Please translate it in a way that fits a slug for a "Gallery" page in the target language, considering the common usage in websites for that language. Make sure to keep the slug lowercase and url-friendly.
slug:(0,s.__)("gallery","extendify-local"),alias:["gallery"]},home:{
// translators: This string represents the title of an "Home" page on a website. Please translate it in a way that fits the standard phrasing for a "Home" page in the target language, considering the common usage in websites for that language.
title:(0,s.__)("Home","extendify-local"),alias:["home"]},menu:{
// translators: This string represents the title of a "Menu" page on a website that lists food or drink items. Please translate it in a way that fits the standard phrasing for a "Menu" page in the target language, considering the common usage in websites for that language.
title:(0,s.__)("Menu","extendify-local"),
// translators: This string represents the slug of a "Menu" page on a website that lists food or drink items. Please translate it in a way that fits a slug for a "Menu" page in the target language, considering the common usage in websites for that language. Make sure to keep the slug lowercase and url-friendly.
slug:(0,s.__)("menu","extendify-local"),alias:["menu"]},porfolio:{
// translators: This string represents the title of a "Portfolio" page on a website that showcases a collection of work. Please translate it in a way that fits the standard phrasing for a "Portfolio" page in the target language, considering the common usage in websites for that language.
title:(0,s.__)("Portfolio","extendify-local"),
// translators: This string represents the slug of a "Portfolio" page on a website that showcases a collection of work. Please translate it in a way that fits a slug for a "Portfolio" page in the target language, considering the common usage in websites for that language. Make sure to keep the slug lowercase and url-friendly.
slug:(0,s.__)("portfolio","extendify-local"),alias:["portfolio"]},pricing:{
// translators: This string represents the title of a "Pricing" page on a website that lists the pricing of products or services. Please translate it in a way that fits the standard phrasing for a "Pricing" page in the target language, considering the common usage in websites for that language.
title:(0,s.__)("Pricing","extendify-local"),
// translators: This string represents the slug of a "Pricing" page on a website that lists the pricing of products or services. Please translate it in a way that fits a slug for a "Pricing" page in the target language, considering the common usage in websites for that language. Make sure to keep the slug lowercase and url-friendly.
slug:(0,s.__)("pricing","extendify-local"),alias:["pricing"]},products:{
// translators: This string represents the title of a "Products" page on a website that lists products. Please translate it in a way that fits the standard phrasing for a "Products" page in the target language, considering the common usage in websites for that language.
title:(0,s.__)("Products","extendify-local"),
// translators: This string represents the slug of a "Products" page on a website that lists products. Please translate it in a way that fits a slug for a "Products" page in the target language, considering the common usage in websites for that language. Make sure to keep the slug lowercase and url-friendly.
slug:(0,s.__)("products","extendify-local"),alias:["products","best-sellers-products","featured-products","new-arrivals-product","on-sale-products","product-section","products-by-category","products-categories","top-rated-products"]},quote:{
// translators: This string represents the title of a "Quote" page on a website that allows visitors to request a quote. Please translate it in a way that fits the standard phrasing for a "Quote" page in the target language, considering the common usage in websites for that language.
title:(0,s.__)("Quote","extendify-local"),
// translators: This string represents the slug of a "Quote" page on a website that allows visitors to request a quote. Please translate it in a way that fits a slug for a "Quote" page in the target language, considering the common usage in websites for that language. Make sure to keep the slug lowercase and url-friendly.
slug:(0,s.__)("quote","extendify-local"),alias:["quote"]},reservation:{
// translators: This string represents the title of a "Reservation" page on a website that allows visitors to make a reservation. Please translate it in a way that fits the standard phrasing for a "Reservation" page in the target language, considering the common usage in websites for that language.
title:(0,s.__)("Reservation","extendify-local"),
// translators: This string represents the slug of a "Reservation" page on a website that allows visitors to make a reservation. Please translate it in a way that fits a slug for a "Reservation" page in the target language, considering the common usage in websites for that language. Make sure to keep the slug lowercase and url-friendly.
slug:(0,s.__)("reservation","extendify-local"),alias:["reservation"]},resources:{
// translators: This string represents the title of a "Resources" page on a website that provides resources. Please translate it in a way that fits the standard phrasing for a "Resources" page in the target language, considering the common usage in websites for that language.
title:(0,s.__)("Resources","extendify-local"),
// translators: This string represents the slug of a "Resources" page on a website that provides resources. Please translate it in a way that fits a slug for a "Resources" page in the target language, considering the common usage in websites for that language. Make sure to keep the slug lowercase and url-friendly.
slug:(0,s.__)("resources","extendify-local"),alias:["resources","resource"]},serviceArea:{
// translators: This string represents the title of a "Service Area" page on a website that shows the service area of a business, including a map. Please translate it in a way that fits the standard phrasing for a "Service Area" page in the target language, considering the common usage in websites for that language.
title:(0,s.__)("Service Area","extendify-local"),
// translators: This string represents the slug of a "Service Area" page on a website that shows the service area of a business, including a map. Please translate it in a way that fits a slug for a "Service Area" page in the target language, considering the common usage in websites for that language. Make sure to keep the slug lowercase and url-friendly.
slug:(0,s.__)("service-area","extendify-local"),alias:["service-area"]},services:{
// translators: This string represents the title of a "Services" page on a website that lists services. Please translate it in a way that fits the standard phrasing for a "Services" page in the target language, considering the common usage in websites for that language.
title:(0,s.__)("Services","extendify-local"),
// translators: This string represents the slug of a "Services" page on a website that lists services. Please translate it in a way that fits a slug for a "Services" page in the target language, considering the common usage in websites for that language. Make sure to keep the slug lowercase and url-friendly.
slug:(0,s.__)("services","extendify-local"),alias:["services"]},specials:{
// translators: This string represents the title of a "Specials" page on a website that lists special offers. Please translate it in a way that fits the standard phrasing for a "Specials" page in the target language, considering the common usage in websites for that language.
title:(0,s.__)("Specials","extendify-local"),
// translators: This string represents the slug of a "Specials" page on a website that lists special offers. Please translate it in a way that fits a slug for a "Specials" page in the target language, considering the common usage in websites for that language. Make sure to keep the slug lowercase and url-friendly.
slug:(0,s.__)("specials","extendify-local"),alias:["specials"]},team:{
// translators: This string represents the title of a "Team" page on a website that introduces the team members. Please translate it in a way that fits the standard phrasing for a "Team" page in the target language, considering the common usage in websites for
title:(0,s.__)("Team","extendify-local"),
// translators: This string represents the slug of a "Team" page on a website that introduces the team members. Please translate it in a way that fits a slug for a "Team" page in the target language, considering the common usage in websites for that language. Make sure to keep the slug lowercase and url-friendly.
slug:(0,s.__)("team","extendify-local"),alias:["team"]},testimonials:{
// translators: This string represents the title of a "Testimonials" page on a website that showcases testimonials from customers. Please translate it in a way that fits the standard phrasing for a "Testimonials" page in the target language, considering the common usage in websites for that language.
title:(0,s.__)("Testimonials","extendify-local"),
// translators: This string represents the slug of a "Testimonials" page on a website that showcases testimonials from customers. Please translate it in a way that fits a slug for a "Testimonials" page in the target language, considering the common usage in websites for that language. Make sure to keep the slug lowercase and url-friendly.
slug:(0,s.__)("testimonials","extendify-local"),alias:["testimonials","testimonial"]}}},7403:(e,t,a)=>{a.d(t,{a:()=>s});const s=e=>{try{return JSON.parse(e)}catch(e){return{}}}},9272:(e,t,a)=>{a.d(t,{_:()=>d,p:()=>u});var s=a(2200),i=a(424),o=a(619);const{showAIConsent:n,userGaveConsent:l}=i.y.getState(),r=["siteId","partnerId","wpVersion","wpLanguage","devbuild","isBlockTheme","userId","siteProfile"],c={...Object.fromEntries(Object.entries(window.extSharedData).filter((([e])=>r.includes(e)))),showAIConsent:n,userGaveConsent:l},d=async e=>{const t=new URLSearchParams({...c,query:e}),a=await fetch(`${s.Yy}/api/draft/image/unsplash?${t.toString()}`,{method:"GET",headers:{"Content-Type":"application/json"}});if(!a.ok)throw new Error("Bad response from server");const i=await a.json();if(!Array.isArray(i))throw new Error("Bad response from server");return i.map((e=>({...e,requestMetadata:{id:a.headers.get("X-Request-Id"),total:a.headers.get("X-Total"),perPage:a.headers.get("X-Per-Page")}})))},u=async()=>{var e;const t=o.f.getState();if(!t.isEmpty()&&!t.hasExpired())return t.images;const{aiKeywords:a}=null!==(e=window.extSharedData?.siteProfile)&&void 0!==e?e:{},s=a?.length?a:[],i=(await Promise.all(s.map(d))).flat(),n=i.reduce(((e,t)=>(e.has(t.id)||e.set(t.id,t),e)),new Map);return t.updateCache(Array.from(n.values())),i}},6993:(e,t,a)=>{a.d(t,{j:()=>_});var s=a(6989),i=a.n(s),o=a(7403),n=a(270),l=a(782);const r="/extendify/v1/shared/activity",c={getItem:()=>i()({path:r}),setItem:(e,t)=>i()({path:r,method:"POST",data:{state:t}})},d=(0,o.a)(window.extSharedData.activity),u={actions:{}},_=(0,n.Ue)((0,l.tJ)((0,l.mW)(((e,t)=>{var a;return{...u,...null!==(a=d?.state)&&void 0!==a?a:{},incrementActivity:a=>{e((e=>({...e,actions:{...e.actions,[a]:Number(t().actions[a]||0)+1}})))}}}),{name:"Extendify Activity"}),{name:"extendify_shared_activity",storage:(0,l.FL)((()=>c)),skipHydration:!0}))},424:(e,t,a)=>{a.d(t,{y:()=>r});var s=a(6989),i=a.n(s),o=a(270),n=a(782);const l={setItem:(e,t)=>i()({path:"/extendify/v1/shared/update-user-meta",method:"POST",data:{option:"ai_consent",value:t.state.userGaveConsent}})},r=(0,o.Ue)((0,n.tJ)((0,n.mW)(((e,t)=>{var a,s,i;return{showAIConsent:null!==(a=window.extSharedData?.showAIConsent)&&void 0!==a&&a,consentTermsHTML:null!==(s=window.extSharedData?.consentTermsHTML)&&void 0!==s?s:"",userGaveConsent:null!==(i=window.extSharedData?.userGaveConsent)&&void 0!==i&&i,setUserGaveConsent:t=>e({userGaveConsent:t}),shouldShowAIConsent:e=>{var a;const{showAIConsent:s,consentTermsHTML:i,userGaveConsent:o}=t(),n=s&&i,l={launch:n,draft:n&&!o,"help-center":n&&!o};return null!==(a=l?.[e])&&void 0!==a&&a}}}),{name:"Extendify AI Consent"}),{name:"extendify-ai-consent",storage:l,skipHydration:!0}))},619:(e,t,a)=>{a.d(t,{f:()=>o});var s=a(270),i=a(782);const o=(0,s.Ue)((0,i.tJ)((0,i.mW)(((e,t)=>({images:[],expiration:0,isEmpty:()=>0===t().images.length,hasExpired:()=>Date.now()>t().expiration,updateCache:t=>e({images:t,expiration:Date.now()+6048e5})})),{name:"Extendify Unsplash Images"}),{name:"extendify-unsplash-images",storage:(0,i.FL)((()=>localStorage))}))},2200:(e,t,a)=>{a.d(t,{Ow:()=>n,TS:()=>l,Yy:()=>s,kE:()=>i,nX:()=>o});const{AI_HOST:s="https://ai.extendify.com",PATTERNS_HOST:i="https://patterns.extendify.com",KB_HOST:o="https://kb.extendify.com",INSIGHTS_HOST:n="https://insights.extendify.com",IMAGES_HOST:l="https://images-resource.extendify.com"}={}}}]);
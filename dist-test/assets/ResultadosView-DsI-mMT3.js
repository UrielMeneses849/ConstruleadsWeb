import{C as e,G as t,H as n,I as r,O as i,Q as a,S as o,U as s,X as c,it as l,q as u,tt as d,w as ee,x as f}from"./index-DL4YUhM0.js";var p=l(d(),1),m=a(),h=100,g=[`inicio`,`fin`,`publicacion`];function _(e){if(!e||e===`-`)return null;if(e instanceof Date)return Number.isNaN(e.getTime())?null:new Date(e.getFullYear(),e.getMonth(),e.getDate());let t=String(e).trim(),n=t.match(/^(\d{4})-(\d{2})-(\d{2})/);if(n){let[,e,t,r]=n;return new Date(Number(e),Number(t)-1,Number(r))}let r=t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);if(r){let[,e,t,n]=r;return new Date(Number(n),Number(t)-1,Number(e))}let i=new Date(t);return Number.isNaN(i.getTime())?null:i}var v=new Intl.DateTimeFormat(`es-MX`,{month:`long`});function y(e){if(!e||e===`-`)return`-`;let t=e instanceof Date?e:_(e);if(!t||Number.isNaN(t.getTime()))return String(e);let n=v.format(t);return`${`${n.charAt(0).toUpperCase()}${n.slice(1)}`} ${t.getDate()}, ${t.getFullYear()}`}function b(e){let t=_(e);return t?`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,`0`)}`:`Sin fecha`}function x(e){if(e==null||e===``)return null;let t=String(e).replace(/[^0-9.-]/g,``),n=Number(t);return Number.isNaN(n)?null:n}function te(e){return e==null?`-`:new Intl.NumberFormat(`es-MX`,{style:`currency`,currency:`MXN`,maximumFractionDigits:0}).format(e)}function S(e){return e==null?`-`:new Intl.NumberFormat(`es-MX`,{maximumFractionDigits:0}).format(e)}function C({obras:a=[],onSelectionChange:l,selectionResetToken:d=0,onViewFicha:v}){let[C,w]=(0,p.useState)(null),[T,E]=(0,p.useState)({}),[ne,D]=(0,p.useState)({}),[O,k]=(0,p.useState)([]),[A,re]=(0,p.useState)({field:null,direction:`asc`}),[ie,j]=(0,p.useState)(1),M=(0,p.useRef)(null),N=(0,p.useRef)(null),P=(0,p.useRef)(d),F=(0,p.useRef)(``),[I,ae]=(0,p.useState)({top:0,left:0}),L={surface:`var(--cl-surface)`,surfaceMuted:`var(--cl-surface-muted)`,hover:`var(--cl-hover)`,border:`var(--cl-border)`,text:`var(--cl-text)`,textStrong:`var(--cl-text-strong)`,textMuted:`var(--cl-text-muted)`,inputBg:`var(--cl-input-bg)`,shadow:`var(--cl-shadow)`},R=e=>{j(1),re(t=>t.field===e?{field:e,direction:t.direction===`asc`?`desc`:`asc`}:{field:e,direction:`asc`})},z=(e,t)=>A.field===e&&A.direction===t?`#FF653F`:L.textMuted,B=(0,p.useMemo)(()=>(a||[]).map((e,t)=>({id:e.Id_Obra||e.ID_OBRA||e.id_obra||e.id||t,clave:e.clave||e.Clave_Proyecto||e.CLAVE_PROYECTO||e.clave_proyecto||e.claveProyecto||e.ClaveProyecto||e.claveproyecto||`-`,proyecto:e.proyecto||e.Proyecto||e.PROYECTO||e.Nombre_Proyecto||e.NOMBRE_PROYECTO||`-`,genero:e.genero||e.Genero||e.GENERO||`-`,subgenero:e.subgenero||e.Subgenero||e.SUBGENERO||e.subGenero||`-`,tipoobra:e.tipoObra||e.Tipo_Obra||e.TIPO_OBRA||e.tipo_obra||e.TipoObra||e.tipoobra||`-`,inversionRaw:x(e.inversion||e.Inversion||e.INVERSION||e.inversionTotal||e.InversionTotal||null),inversion:x(e.inversion||e.Inversion||e.INVERSION||e.inversionTotal||null)===null?`-`:te(x(e.inversion||e.Inversion||e.INVERSION||e.inversionTotal||null)),superficieRaw:x(e.superficie??e.Superficie??e.SUPERFICIE??e.superficieTotal??e.SuperficieTotal??0),superficie:x(e.superficie??e.Superficie??e.SUPERFICIE??e.superficieTotal??e.SuperficieTotal??0)>0?`${S(x(e.superficie??e.Superficie??e.SUPERFICIE??e.superficieTotal??e.SuperficieTotal??0))} m²`:`No definido`,estado:e.estado||e.Estado_Proyecto||e.ESTADO_PROYECTO||e.estado_proyecto||e.Estado||e.ESTADO||`-`,localizacion:e.localizacion||e.Localizacion1||e.ubicacion||e.Ubicacion||e.direccion||e.Direccion||``,inicioRaw:e.fechaInicioDate||e.fechaInicioTime||e.fechaInicio||e.Fecha_Inicio||e.FECHA_INICIO||e.fecha_inicio||e.FechaInicio||e.fechainicio||`-`,inicio:y(e.fechaInicioDate||e.fechaInicioTime||e.fechaInicio||e.Fecha_Inicio||e.FECHA_INICIO||e.fecha_inicio||e.FechaInicio||e.fechainicio),finRaw:e.fechaTerminoDate||e.fechaTerminoTime||e.fechaTerminacionDate||e.fechaFinDate||e.fechaTermino||e.fechaTerminacion||e.fechaFin||e.Fecha_Terminacion||e.Fecha_Termino||e.FECHA_TERMINACION||e.FECHA_TERMINO||e.fecha_terminacion||e.fecha_termino||e.FechaTerminacion||e.FechaTermino||e.fechaterminacion||e.fechatermino||e.Fecha_Fin||e.FECHA_FIN||e.fecha_fin||`-`,fin:y(e.fechaTerminoDate||e.fechaTerminoTime||e.fechaTerminacionDate||e.fechaFinDate||e.fechaTermino||e.fechaTerminacion||e.fechaFin||e.Fecha_Terminacion||e.Fecha_Termino||e.FECHA_TERMINACION||e.FECHA_TERMINO||e.fecha_terminacion||e.fecha_termino||e.FechaTerminacion||e.FechaTermino||e.fechaterminacion||e.fechatermino||e.Fecha_Fin||e.FECHA_FIN||e.fecha_fin||`-`),publicacionRaw:e.fechaPublicacionDate||e.fechaPublicacionTime||e.fechaPublicacion||e.Fecha_publicacion||e.FECHA_PUBLICACION||e.fecha_publicacion||e.FechaPublicacion||e.fechapublicacion||e.Fecha_Publicacion||`-`,publicacion:y(e.fechaPublicacionDate||e.fechaPublicacionTime||e.fechaPublicacion||e.Fecha_publicacion||e.FECHA_PUBLICACION||e.fecha_publicacion||e.FechaPublicacion||e.fechapublicacion||e.Fecha_Publicacion),tipo:e.tipoProyecto||`-`,compania:e.compania||e.Compania||e.COMPANIA||`-`,source:e})),[a]),V=e=>String(e.id||e.clave||e.proyecto),oe={display:`-webkit-box`,WebkitLineClamp:2,WebkitBoxOrient:`vertical`,overflow:`hidden`,textOverflow:`ellipsis`,whiteSpace:`normal`,wordBreak:`break-word`,lineHeight:`1.3`,maxHeight:`2.6em`,textAlign:`left`},H=(e,t=``)=>(0,m.jsx)(`div`,{className:`result-cell-text ${t}`,style:oe,title:typeof e==`string`?e:void 0,children:e??`-`}),se=e=>{let t=[e.localizacion,e.estado].filter(Boolean).filter((e,t,n)=>n.findIndex(t=>String(t).toLowerCase()===String(e).toLowerCase())===t).join(` · `);return(0,m.jsxs)(`div`,{className:`result-project-cell`,title:e.proyecto,children:[(0,m.jsx)(`span`,{className:`result-project-title`,children:e.proyecto||`-`}),t&&(0,m.jsx)(`span`,{className:`result-project-location`,children:t})]})};(0,p.useEffect)(()=>{P.current!==d&&(P.current=d,k([]))},[d]),(0,p.useEffect)(()=>{let e=new Set(B.map(V)),t=window.requestAnimationFrame(()=>{k(t=>t.filter(t=>e.has(t)))});return()=>window.cancelAnimationFrame(t)},[B]),(0,p.useEffect)(()=>{if(!l)return;let e=[...O].sort().join(`|`);if(F.current===e)return;F.current=e;let t=new Set(O);l(B.filter(e=>t.has(V(e))).map(e=>e.source))},[O,B,l]),(0,p.useEffect)(()=>{let e=e=>{e.key===`Escape`&&w(null)},t=e=>{M.current&&!M.current.contains(e.target)&&w(null)};return document.addEventListener(`keydown`,e),document.addEventListener(`mousedown`,t),()=>{document.removeEventListener(`keydown`,e),document.removeEventListener(`mousedown`,t)}},[]);let U=(0,p.useMemo)(()=>B.filter(e=>Object.entries(T).every(([t,n])=>{if(!n||n.length===0)return!0;if(g.includes(t)){let r=b(e[`${t}Raw`]||e[t]);return n.includes(r)}return n.includes(String(e[t]??``))})),[B,T]),W=(0,p.useMemo)(()=>{if(!A.field)return U;let e=[...U],{field:t,direction:n}=A;return e.sort((e,r)=>{let i=String(e[t]??``).trim(),a=String(r[t]??``).trim();if(g.includes(t)){let o=_(e[`${t}Raw`]||i),s=_(r[`${t}Raw`]||a);return o&&s?n===`asc`?o.getTime()-s.getTime():s.getTime()-o.getTime():o?n===`asc`?-1:1:s?n===`asc`?1:-1:0}if(t===`inversion`||t===`superficie`){let i=Number(e[`${t}Raw`]??NaN),a=Number(r[`${t}Raw`]??NaN);return Number.isFinite(i)&&Number.isFinite(a)?n===`asc`?i-a:a-i:Number.isFinite(i)?n===`asc`?-1:1:Number.isFinite(a)?n===`asc`?1:-1:0}let o=i.localeCompare(a,`es`,{numeric:!0});return n===`asc`?o:-o}),e},[U,A]),G=Math.max(1,Math.ceil(W.length/h)),K=Math.min(ie,G),q=(0,p.useMemo)(()=>{let e=(K-1)*h;return W.slice(e,e+h)},[W,K]),J=(0,p.useMemo)(()=>{let e=[],t={clave:`Clave`,proyecto:`Proyecto`,compania:`Compañía`,genero:`Género`,subgenero:`Subgénero`,tipoobra:`Tipo de obra`,estado:`Estado`,inversion:`Inversión`,superficie:`Superficie`,inicio:`Inicio`,fin:`Término`,publicacion:`Publicación`};return Object.entries(T).forEach(([n,r])=>{!Array.isArray(r)||!r.length||e.push({key:`column-${n}`,label:t[n]||n,value:r.length===1?r[0]:`${r.length} seleccionados`})}),e},[T]),ce=()=>{E({}),D({}),w(null),j(1)},Y=(0,p.useMemo)(()=>new Set(O),[O]),le=(0,p.useMemo)(()=>[`clave`,`proyecto`,`genero`,`subgenero`,`estado`,`inversion`,`superficie`,`inicio`,`fin`,`publicacion`,`tipoobra`,`compania`].reduce((e,t)=>(e[t]=[...new Set(B.map(e=>String(e[`${t}Raw`]||e[t]||``)).filter(Boolean))].sort((e,t)=>{let n=_(e),r=_(t);return n&&r?n.getTime()-r.getTime():e.localeCompare(t,`es`)}),e),{}),[B]),X=U.length>0&&U.every(e=>Y.has(V(e))),ue=O.length>0&&U.some(e=>Y.has(V(e)))&&!X,de=(e,t)=>{let n=t.getBoundingClientRect(),r=N.current,i=r?.getBoundingClientRect(),a=r&&i?.width?i.width/r.offsetWidth:1,o=r&&i?.height?i.height/r.offsetHeight:a,s=g.includes(e)?300:280,c=i?(n.left-i.left)/a-20:n.left;ae({top:i?(n.bottom-i.top)/o+8:n.bottom+8,left:r?Math.max(8,Math.min(c,r.offsetWidth-s-8)):c}),w(t=>t===e?null:e)},Z=e=>le[e]||[],Q=(e,t)=>{j(1),E(n=>{let r=n[e]||[];return{...n,[e]:r.includes(t)?r.filter(e=>e!==t):[...r,t]}})},fe=e=>{let t=V(e);k(e=>e.includes(t)?e.filter(e=>e!==t):[...e,t])},pe=()=>{let e=U.map(V);k(t=>X?t.filter(t=>!e.includes(t)):[...new Set([...t,...e])])},$=(e,i)=>(0,m.jsxs)(s,{align:`center`,justify:`flex-start`,gap:1,minW:`max-content`,children:[(0,m.jsx)(u,{fontSize:`10px`,fontWeight:`800`,color:L.textMuted,letterSpacing:`.045em`,textTransform:`uppercase`,whiteSpace:`nowrap`,flexShrink:0,children:i}),(0,m.jsxs)(n,{spacing:0,flexShrink:0,children:[(0,m.jsx)(t,{variant:`ghost`,size:`xs`,minW:`20px`,w:`20px`,h:`20px`,p:0,borderRadius:`6px`,_hover:{bg:L.hover},onClick:t=>{t.stopPropagation(),de(e,t.currentTarget)},"aria-label":`Filtrar ${i}`,title:`Filtrar ${i}`,children:(0,m.jsx)(r,{size:11,color:L.textMuted})}),(0,m.jsx)(t,{variant:`ghost`,size:`xs`,minW:`20px`,w:`20px`,h:`20px`,p:0,borderRadius:`6px`,_hover:{bg:L.hover},onClick:t=>{t.stopPropagation(),R(e)},"aria-label":`Ordenar ${i}`,title:`Ordenar ${i}`,children:(0,m.jsxs)(s,{direction:`column`,align:`center`,gap:0,children:[(0,m.jsx)(ee,{size:9,color:z(e,`asc`)}),(0,m.jsx)(f,{size:9,color:z(e,`desc`)})]})})]})]});return(0,m.jsxs)(c,{height:`100%`,minH:`0`,overflow:`hidden`,display:`flex`,flexDirection:`column`,bg:L.surface,color:L.text,pt:0,children:[(0,m.jsxs)(c,{ref:N,bg:L.surface,border:`1px solid ${L.border}`,borderRadius:`8px`,overflow:`hidden`,flex:`1`,minH:`0`,display:`flex`,flexDirection:`column`,position:`relative`,children:[(0,m.jsxs)(c,{flex:`1`,minH:`0`,minW:`0`,overflow:`hidden`,overscrollBehavior:`contain`,children:[(0,m.jsx)(`style`,{children:`
              .resultados-scroll {
                scrollbar-width: auto;
                scrollbar-color: var(--cl-text-muted) var(--cl-surface-muted);
              }
              .resultados-scroll::-webkit-scrollbar {
                width: 12px;
                height: 12px;
              }
              .resultados-scroll::-webkit-scrollbar-track {
                background: var(--cl-surface-muted);
                border-radius: 999px;
              }
              .resultados-scroll::-webkit-scrollbar-thumb {
                background: var(--cl-text-muted);
                border: 3px solid var(--cl-surface-muted);
                border-radius: 999px;
              }
              .resultados-scroll::-webkit-scrollbar-thumb:hover {
                background: var(--cl-text-strong);
              }
              .resultados-table thead th {
                position: sticky;
                top: 0;
                z-index: 2;
                background: var(--cl-surface-muted);
              }
              .resultados-table th,
              .resultados-table td {
                box-sizing: border-box;
                text-align: left !important;
                vertical-align: middle;
              }
              .resultados-table th:first-child,
              .resultados-table td:first-child,
              .resultados-table th:last-child,
              .resultados-table td:last-child {
                text-align: center !important;
              }
              .resultados-table th:last-child {
                position: sticky;
                right: 0;
                z-index: 5;
                background: var(--cl-surface-muted);
                box-shadow: -1px 0 0 var(--cl-border);
              }
              .resultados-table td:last-child {
                position: sticky;
                right: 0;
                z-index: 3;
                box-shadow: -1px 0 0 var(--cl-border);
                vertical-align: middle;
              }
              .resultados-action-cell {
                height: 100%;
                min-height: 52px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: inherit;
              }
              /* Jerarquía editorial: lo operativo se lee primero; la ubicación
                 y las fechas acompañan sin competir con el nombre del proyecto. */
              .resultados-table {
                font-variant-numeric: tabular-nums;
              }
              .resultados-table tbody tr {
                transition: background-color 140ms ease;
              }
              .resultados-table tbody tr:hover td {
                background: var(--cl-hover);
              }
              .resultados-table .resultados-cell {
                color: var(--cl-text);
                font-size: 12px;
                line-height: 1.32;
              }
              .resultados-table .resultados-cell-key .result-cell-text {
                color: var(--cl-text-muted);
                font-size: 11px;
                font-weight: 400;
                letter-spacing: .01em;
              }
              .resultados-table .result-cell-text {
                color: var(--cl-text);
                font-size: 12px;
              }
              .resultados-table .resultados-cell-company .result-cell-text {
                color: var(--cl-text-strong);
                font-weight: 500;
              }
              .resultados-table .resultados-cell-state .result-cell-text {
                color: var(--cl-text-muted);
                font-size: 11px;
                font-weight: 400;
              }
              .resultados-table .resultados-cell-number .result-cell-text {
                color: var(--cl-text-strong);
                font-size: 11px;
                font-weight: 400;
                text-align: right;
              }
              .resultados-table .resultados-cell-emphasis .result-cell-text {
                font-weight: 500;
              }
              .resultados-table .resultados-cell-number.resultados-cell-undefined .result-cell-text {
                color: var(--cl-text-muted);
                font-weight: 400;
              }
              .resultados-table .resultados-cell-date .result-cell-text {
                color: var(--cl-text-muted);
                font-size: 11px;
                font-weight: 400;
              }
              .resultados-table .result-project-cell {
                display: flex;
                flex-direction: column;
                gap: 3px;
                min-width: 0;
              }
              .resultados-table .result-project-title {
                color: var(--cl-text-strong);
                display: -webkit-box;
                font-size: 12px;
                font-weight: 500;
                line-height: 1.28;
                overflow: hidden;
                -webkit-box-orient: vertical;
                -webkit-line-clamp: 2;
              }
              .resultados-table .result-project-location {
                color: var(--cl-text-muted);
                font-size: 10px;
                font-weight: 400;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
              .resultados-table thead th:not(:first-child) {
                letter-spacing: .04em;
              }
              @media (max-width: 1180px) {
                .resultados-table .resultados-cell { font-size: 11px; }
                .resultados-table .result-project-title { font-size: 11px; }
              }
            `}),(0,m.jsx)(c,{className:`resultados-scroll`,h:`100%`,minH:`0`,minW:`0`,overflowX:`auto`,overflowY:`scroll`,overscrollBehavior:`contain`,children:(0,m.jsxs)(`table`,{className:`resultados-table`,style:{minWidth:`2000px`,width:`100%`,borderCollapse:`collapse`,fontSize:`14px`,tableLayout:`fixed`},children:[(0,m.jsxs)(`colgroup`,{children:[(0,m.jsx)(`col`,{style:{width:`2.5%`}}),(0,m.jsx)(`col`,{style:{width:`5%`}}),(0,m.jsx)(`col`,{style:{width:`15%`}}),(0,m.jsx)(`col`,{style:{width:`7%`}}),(0,m.jsx)(`col`,{style:{width:`7%`}}),(0,m.jsx)(`col`,{style:{width:`7%`}}),(0,m.jsx)(`col`,{style:{width:`6%`}}),(0,m.jsx)(`col`,{style:{width:`6.5%`}}),(0,m.jsx)(`col`,{style:{width:`9%`}}),(0,m.jsx)(`col`,{style:{width:`10.75%`}}),(0,m.jsx)(`col`,{style:{width:`9.75%`}}),(0,m.jsx)(`col`,{style:{width:`6%`}}),(0,m.jsx)(`col`,{style:{width:`5%`}}),(0,m.jsx)(`col`,{style:{width:`3.5%`}})]}),(0,m.jsx)(`thead`,{style:{background:L.surfaceMuted},children:(0,m.jsxs)(`tr`,{children:[(0,m.jsx)(`th`,{style:{padding:`12px 10px`,textAlign:`center`,borderBottom:`1px solid ${L.border}`},children:(0,m.jsx)(`input`,{type:`checkbox`,checked:X,ref:e=>{e&&(e.indeterminate=ue)},onChange:pe,style:{accentColor:`#4B5563`,width:14,height:14}})}),(0,m.jsx)(`th`,{style:{padding:`14px 14px`,textAlign:`left`,borderBottom:`1px solid ${L.border}`},children:$(`clave`,`Clave`)}),(0,m.jsx)(`th`,{style:{padding:`14px 14px`,textAlign:`left`,borderBottom:`1px solid ${L.border}`},children:$(`proyecto`,`Proyecto`)}),(0,m.jsx)(`th`,{style:{padding:`12px 10px`,textAlign:`left`,borderBottom:`1px solid ${L.border}`},children:$(`genero`,`Género`)}),(0,m.jsx)(`th`,{style:{padding:`12px 10px`,textAlign:`left`,borderBottom:`1px solid ${L.border}`,whiteSpace:`nowrap`},children:$(`subgenero`,`Subgénero`)}),(0,m.jsx)(`th`,{style:{padding:`12px 8px`,textAlign:`left`,borderBottom:`1px solid ${L.border}`,whiteSpace:`nowrap`},children:$(`publicacion`,`Publicación`)}),(0,m.jsx)(`th`,{style:{padding:`12px 8px`,textAlign:`left`,borderBottom:`1px solid ${L.border}`,whiteSpace:`nowrap`},children:$(`inicio`,`Inicio`)}),(0,m.jsx)(`th`,{style:{padding:`12px 8px`,textAlign:`left`,borderBottom:`1px solid ${L.border}`,whiteSpace:`nowrap`},children:$(`fin`,`Término`)}),(0,m.jsx)(`th`,{style:{padding:`12px 10px`,textAlign:`left`,borderBottom:`1px solid ${L.border}`},children:$(`inversion`,`Inversión (MXN)`)}),(0,m.jsx)(`th`,{style:{padding:`14px 14px`,textAlign:`left`,borderBottom:`1px solid ${L.border}`},children:$(`compania`,`Compañía`)}),(0,m.jsx)(`th`,{style:{padding:`12px 10px`,textAlign:`left`,borderBottom:`1px solid ${L.border}`},children:$(`tipoobra`,`Tipo de obra`)}),(0,m.jsx)(`th`,{style:{padding:`12px 10px`,textAlign:`left`,borderBottom:`1px solid ${L.border}`,whiteSpace:`nowrap`},children:$(`superficie`,`Superficie`)}),(0,m.jsx)(`th`,{style:{padding:`12px 10px`,textAlign:`left`,borderBottom:`1px solid ${L.border}`},children:$(`estado`,`Estado`)}),(0,m.jsx)(`th`,{style:{padding:`12px 6px`,textAlign:`center`,fontWeight:700,color:L.textMuted,whiteSpace:`nowrap`,fontSize:`13px`,borderBottom:`1px solid ${L.border}`,background:L.surfaceMuted},children:`Acciones`})]})}),(0,m.jsx)(`tbody`,{children:q.map((e,n)=>{let r=V(e),a=Y.has(r),o=a?`var(--cl-selected)`:n%2==0?L.surface:L.surfaceMuted;return(0,m.jsxs)(`tr`,{style:{background:o},children:[(0,m.jsx)(`td`,{style:{padding:`12px 10px`,borderTop:`1px solid ${L.border}`,textAlign:`center`},children:(0,m.jsx)(`input`,{type:`checkbox`,checked:a,onChange:()=>fe(e),style:{accentColor:`#4B5563`,width:14,height:14}})}),(0,m.jsx)(`td`,{className:`resultados-cell resultados-cell-key`,style:{padding:`10px 12px`,borderTop:`1px solid ${L.border}`},children:H(e.clave)}),(0,m.jsx)(`td`,{className:`resultados-cell resultados-cell-project`,style:{padding:`10px 12px`,borderTop:`1px solid ${L.border}`},children:se(e)}),(0,m.jsx)(`td`,{className:`resultados-cell resultados-cell-emphasis`,style:{padding:`10px 12px`,borderTop:`1px solid ${L.border}`},children:H(e.genero)}),(0,m.jsx)(`td`,{className:`resultados-cell resultados-cell-emphasis`,style:{padding:`10px 12px`,borderTop:`1px solid ${L.border}`},children:H(e.subgenero)}),(0,m.jsx)(`td`,{className:`resultados-cell resultados-cell-date`,style:{padding:`10px 8px`,borderTop:`1px solid ${L.border}`},children:H(e.publicacion)}),(0,m.jsx)(`td`,{className:`resultados-cell resultados-cell-date`,style:{padding:`10px 8px`,borderTop:`1px solid ${L.border}`},children:H(e.inicio)}),(0,m.jsx)(`td`,{className:`resultados-cell resultados-cell-date`,style:{padding:`10px 8px`,borderTop:`1px solid ${L.border}`},children:H(e.fin)}),(0,m.jsx)(`td`,{className:`resultados-cell resultados-cell-number resultados-cell-emphasis`,style:{padding:`10px 12px`,borderTop:`1px solid ${L.border}`},children:H(e.inversion)}),(0,m.jsx)(`td`,{className:`resultados-cell resultados-cell-company`,style:{padding:`10px 12px`,borderTop:`1px solid ${L.border}`},children:H(e.compania)}),(0,m.jsx)(`td`,{className:`resultados-cell`,style:{padding:`10px 12px`,borderTop:`1px solid ${L.border}`},children:H(e.tipoobra)}),(0,m.jsx)(`td`,{className:`resultados-cell resultados-cell-number resultados-cell-emphasis${e.superficie===`No definido`?` resultados-cell-undefined`:``}`,style:{padding:`10px 12px`,borderTop:`1px solid ${L.border}`},children:H(e.superficie)}),(0,m.jsx)(`td`,{className:`resultados-cell resultados-cell-state`,style:{padding:`10px 12px`,borderTop:`1px solid ${L.border}`},children:H(e.estado)}),(0,m.jsx)(`td`,{style:{padding:0,borderTop:`1px solid ${L.border}`,whiteSpace:`nowrap`,fontSize:`13px`,textAlign:`center`,background:o},children:(0,m.jsx)(`div`,{className:`resultados-action-cell`,children:(0,m.jsx)(t,{size:`xs`,variant:`outline`,"aria-label":`Ver proyecto`,title:`Ver proyecto`,w:`32px`,h:`32px`,minW:`32px`,p:0,borderColor:L.border,color:L.textStrong,borderRadius:`8px`,bg:o,_hover:{bg:L.surfaceMuted,borderColor:`#FF653F`,color:`#FF653F`},onClick:()=>v?.(e.source||e),children:(0,m.jsx)(i,{size:15})})})})]},r)})},`tbody-${a.length}`)]})})]}),C&&(0,m.jsxs)(`div`,{ref:M,style:{position:`absolute`,top:`${I.top}px`,left:`${I.left}px`,zIndex:1e3,background:L.surface,border:`1px solid ${L.border}`,borderRadius:`10px`,padding:`12px`,width:g.includes(C)?`300px`:`280px`,maxHeight:`340px`,overflowY:`auto`,boxShadow:`none`,color:L.textStrong,fontSize:`13px`},children:[g.includes(C)?(e=>{let n=Z(e).filter(e=>_(e)).reduce((e,t)=>{let n=_(t),r=n?String(n.getFullYear()):`Sin fecha`,i=b(t),a=n?new Intl.DateTimeFormat(`es-MX`,{month:`long`}).format(n):t;return e[r]=e[r]||[],e[r].some(e=>e.key===i)||e[r].push({key:i,label:a,date:n}),e},{}),r=Object.keys(n).sort((e,t)=>e===`Sin fecha`?1:t===`Sin fecha`?-1:Number(t)-Number(e));return(0,m.jsxs)(c,{children:[(0,m.jsx)(u,{fontSize:`12px`,fontWeight:`700`,color:L.textStrong,mb:3,children:`Año y meses con información`}),r.map(r=>(0,m.jsxs)(c,{mb:4,children:[(0,m.jsx)(u,{fontSize:`12px`,fontWeight:`700`,color:L.textMuted,mb:2,children:r}),(0,m.jsx)(c,{display:`grid`,gridTemplateColumns:`repeat(4, minmax(0, 1fr))`,gap:`6px`,children:n[r].sort((e,t)=>e.date?.getTime()-t.date?.getTime()).map(({key:n,label:r})=>{let i=(T[e]||[]).includes(n);return(0,m.jsx)(t,{size:`xs`,h:`30px`,minW:`0`,borderRadius:`8px`,bg:i?`#FF653F`:L.surfaceMuted,color:i?`white`:L.text,border:`1px solid ${i?`#FF653F`:L.border}`,_hover:{bg:i?`#FF653F`:L.hover,borderColor:i?`#FF653F`:L.textMuted},onClick:()=>Q(e,n),title:r,children:r},n)})})]},r))]})})(C):(e=>{let t=ne[e]||``,n=e===`clave`||e===`proyecto`||e===`compania`,r=Z(e).filter(e=>String(e).toLowerCase().includes(t.toLowerCase())),i=n&&!t?r.slice(0,80):r;return(0,m.jsxs)(c,{children:[n&&(0,m.jsx)(`input`,{value:t,onChange:t=>D(n=>({...n,[e]:t.target.value})),placeholder:e===`compania`?`Buscar compañía...`:e===`clave`?`Buscar clave...`:`Buscar proyecto...`,style:{width:`100%`,height:`34px`,borderRadius:`8px`,border:`1px solid ${L.border}`,padding:`0 10px`,marginBottom:`10px`,background:L.inputBg,color:L.text,outline:`none`,fontSize:`13px`}}),n&&!t&&r.length>i.length&&(0,m.jsxs)(u,{fontSize:`11px`,color:L.textMuted,mb:2,children:[`Escribe para buscar entre `,r.length,` `,e===`compania`?`compañías`:e===`clave`?`claves`:`proyectos`,`.`]}),i.map(e=>(0,m.jsxs)(`label`,{style:{display:`flex`,gap:`8px`,alignItems:`flex-start`,marginBottom:`8px`,lineHeight:1.35,cursor:`pointer`},children:[(0,m.jsx)(`input`,{type:`checkbox`,checked:(T[C]||[]).includes(e),onChange:()=>Q(C,e),style:{accentColor:`#4B5563`,marginTop:`2px`}}),(0,m.jsx)(`span`,{children:e})]},e))]})})(C),(0,m.jsxs)(s,{position:`sticky`,bottom:`-12px`,mt:3,mx:`-12px`,mb:`-12px`,px:3,py:2.5,justify:`space-between`,align:`center`,bg:L.surface,borderTop:`1px solid ${L.border}`,children:[(0,m.jsx)(t,{size:`xs`,variant:`ghost`,color:L.text,onClick:()=>{E(e=>({...e,[C]:[]})),D(e=>({...e,[C]:``})),j(1)},children:`Limpiar`}),(0,m.jsx)(t,{size:`xs`,bg:`#FF653F`,color:`white`,_hover:{bg:`#E85A37`},onClick:()=>w(null),children:`Listo`})]})]})]}),J.length>0&&(0,m.jsxs)(s,{flexShrink:0,align:`center`,gap:2,px:3,py:2,borderTop:`1px solid ${L.border}`,bg:L.surface,minW:0,children:[(0,m.jsxs)(u,{color:L.textMuted,fontSize:`11px`,fontWeight:`600`,whiteSpace:`nowrap`,children:[`Filtros de tabla (`,J.length,`)`]}),(0,m.jsx)(s,{gap:1.5,overflowX:`auto`,flex:`1`,minW:0,pb:`1px`,children:J.map(e=>(0,m.jsxs)(s,{align:`center`,gap:1,px:2,h:`28px`,flexShrink:0,maxW:`280px`,borderRadius:`999px`,border:`1px solid rgba(255, 101, 63, .42)`,bg:`rgba(255, 101, 63, .08)`,color:L.text,children:[(0,m.jsxs)(u,{fontSize:`11px`,color:L.textMuted,whiteSpace:`nowrap`,children:[e.label,`:`]}),(0,m.jsx)(u,{fontSize:`11px`,fontWeight:`600`,noOfLines:1,title:e.value,children:e.value})]},e.key))}),(0,m.jsx)(t,{size:`xs`,h:`28px`,px:3,flexShrink:0,borderRadius:`8px`,bg:`#FF653F`,color:`white`,_hover:{bg:`#E85A37`},onClick:ce,children:`Limpiar filtros`})]}),(0,m.jsxs)(s,{flexShrink:0,justify:`space-between`,align:`center`,px:3,borderTop:`1px solid ${L.border}`,bg:L.surface,py:3,mt:0,children:[(0,m.jsxs)(s,{align:`center`,gap:3,minW:0,children:[(0,m.jsxs)(u,{color:L.textMuted,fontSize:`13px`,whiteSpace:`nowrap`,children:[`Mostrando `,q.length?`${(K-1)*h+1}-${Math.min(K*h,U.length)}`:`0`,` de `,U.length,` resultados`]}),G>1&&(0,m.jsxs)(n,{spacing:1,children:[(0,m.jsx)(t,{size:`xs`,variant:`outline`,"aria-label":`Página anterior`,title:`Página anterior`,minW:`28px`,h:`28px`,p:0,borderColor:L.border,isDisabled:K===1,onClick:()=>j(Math.max(1,K-1)),children:(0,m.jsx)(o,{size:14})}),(0,m.jsxs)(u,{color:L.textMuted,fontSize:`12px`,minW:`76px`,textAlign:`center`,children:[K,` de `,G]}),(0,m.jsx)(t,{size:`xs`,variant:`outline`,"aria-label":`Página siguiente`,title:`Página siguiente`,minW:`28px`,h:`28px`,p:0,borderColor:L.border,isDisabled:K===G,onClick:()=>j(Math.min(G,K+1)),children:(0,m.jsx)(e,{size:14})})]})]}),(0,m.jsxs)(u,{color:L.textMuted,fontSize:`13px`,children:[O.length,` seleccionados`]})]})]})}export{C as default};
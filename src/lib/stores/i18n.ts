import { derived } from 'svelte/store';
import { settings } from './settingsStore';

type Translations = Record<string, Record<string, string>>;

const translations: Translations = {
  en: {
    // MenuBar / Navigation
    'nav.jobs': 'Jobs',
    'nav.templates': 'Templates',
    'nav.settings': 'Settings',

    // TopBar
    'topbar.print': 'Print PDF',
    'topbar.export_offer': 'Export Offer',

    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.duplicate': 'Duplicate',
    'common.remove': 'Remove',

    // Modals
    'modal.delete_job.title': 'Delete Job',
    'modal.delete_job.message': 'Delete "{name}" and all its labels? This cannot be undone.',
    'modal.delete': 'Delete',
    'modal.cancel': 'Cancel',
    'modal.delete_template.title': 'Delete Template',
    'modal.delete_template.message': 'Delete "{name}"? This cannot be undone.',
    'modal.delete_label.title': 'Delete Label',
    'modal.delete_label.message': 'Delete "{name}"? This cannot be undone.',
    'modal.delete_preset.title': 'Delete Preset',
    'modal.delete_preset.message': 'Delete preset "{name}"? This cannot be undone.',

    // NewJobModal
    'newjob.title': 'New Job',
    'newjob.client_label': 'Client Name (optional)',
    'newjob.template_label': 'Template',
    'newjob.create_btn': 'Create Job',
    'newjob.empty_hint': 'You need a template to define label fields and dimensions.',
    'newjob.create_template_btn': 'Create a Template',

    // JobManager
    'jobs.title': 'Jobs',
    'jobs.search_placeholder': 'Search jobs...',
    'jobs.new_job': 'New Job',
    'jobs.empty.title': 'No jobs yet',
    'jobs.empty.desc': 'Create your first job to get started',
    'jobs.table.name': 'Name',
    'jobs.table.client': 'Client',
    'jobs.table.labels': 'Labels',
    'jobs.table.created': 'Created',
    'jobs.table.modified': 'Modified',
    'jobs.no_results': 'No jobs match "{search}"',

    // TemplateManager
    'templates.title': 'Templates',
    'templates.new_template': 'New Template',
    'templates.empty.title': 'No templates yet',
    'templates.empty.desc': 'Create a template to define your label layout and fields.',
    'templates.create_first': 'Create Your First Template',
    'templates.field_count': '{count} fields:',

    // TemplateEditor
    'tpl_edit.new_title': 'New Template',
    'tpl_edit.edit_title': 'Edit Template',
    'tpl_edit.name_label': 'Template Name',
    'tpl_edit.name_placeholder': 'e.g. Standard Stirrup Label',
    'tpl_edit.page_setup': 'Page Setup',
    'tpl_edit.page_size': 'Page Size',
    'tpl_edit.orientation': 'Orientation',
    'tpl_edit.portrait': 'Portrait',
    'tpl_edit.landscape': 'Landscape',
    'tpl_edit.page_w': 'Page Width (mm)',
    'tpl_edit.page_h': 'Page Height (mm)',
    'tpl_edit.label_size': 'Label Size',
    'tpl_edit.custom_dims': 'Custom label dimensions (mm)',
    'tpl_edit.columns': 'Columns',
    'tpl_edit.rows': 'Rows',
    'tpl_edit.auto_size_hint': 'Labels will auto-size to fill the page in a {cols}×{rows} grid.',
    'tpl_edit.width': 'Width (mm)',
    'tpl_edit.height': 'Height (mm)',
    'tpl_edit.branding': 'Branding',
    'tpl_edit.show_logo': 'Show logo on labels',
    'tpl_edit.no_logo_hint': 'No logo uploaded yet.',
    'tpl_edit.show_phone': 'Show phone number under logo',
    'tpl_edit.phone_hint': 'Company phone is set in Settings.',
    'tpl_edit.fields': 'Fields',
    'tpl_edit.add_field': '+ Add Field',
    'tpl_edit.empty_fields': 'No fields yet. Click "Add Field" to define label content.',
    'tpl_edit.field_name_ph': 'Field name (e.g. Client)',
    'tpl_edit.field_default_ph': 'Default value',
    'tpl_edit.field_unnamed': '(unnamed field)',
    'tpl_edit.field_name_label': 'Field Name',
    'tpl_edit.field_type_label': 'Type',
    'tpl_edit.type_text': 'Text',
    'tpl_edit.type_number': 'Number',
    'tpl_edit.default_label': 'Default Value',
    'tpl_edit.font_size_label': 'Font Size',
    'tpl_edit.font_small': 'S',
    'tpl_edit.font_medium': 'M',
    'tpl_edit.font_large': 'L',
    'tpl_edit.bold_label': 'Bold',
    'tpl_edit.layout_label': 'Layout',
    'tpl_edit.layout_full': 'Full width',
    'tpl_edit.layout_half': 'Half width',
    'tpl_edit.split_row': 'Split to own row',
    'tpl_edit.pair_placeholder': 'Drag field here',
    'tpl_edit.scope_label': 'Scope',
    'tpl_edit.scope_per_label': 'Per label',
    'tpl_edit.scope_shared': 'Shared',
    'tpl_edit.source_label': 'Source',
    'tpl_edit.source_manual': 'Manual',
    'tpl_edit.source_total_length': 'Total Length',
    'tpl_edit.source_client_name': 'Client Name',
    'tpl_edit.source_diameter': 'Diameter (Ø)',
    'tpl_edit.source_buc': 'Copies (Buc.)',
    'tpl_edit.drag_hint': 'Drag to reorder',
    'tpl_edit.preview_title': 'Label Preview',
    'tpl_edit.print_layout_heading': 'Print Layout',
    'tpl_edit.print_layout': 'Custom print margins',
    'tpl_edit.margin_top': 'Top Margin (mm)',
    'tpl_edit.margin_bottom': 'Bottom Margin (mm)',
    'tpl_edit.margin_left': 'Left Margin (mm)',
    'tpl_edit.margin_right': 'Right Margin (mm)',
    'tpl_edit.label_gap': 'Label Gap (mm)',
    'tpl_edit.printer_margin': 'Printer Margin (mm)',
    'tpl_edit.printer_margin_hint': 'Non-printable area. Default 4.5mm for most printers.',
    'tpl_edit.field_padding': 'Field Padding (mm)',
    'tpl_edit.field_padding_hint': 'Distance from label edge to field text. Default 6mm.',
    'tpl_edit.length_unit': 'Length Unit',
    'tpl_edit.unit_mm': 'Millimeters (mm)',
    'tpl_edit.unit_cm': 'Centimeters (cm)',

    // LabelEditor
    'lbl_edit.saving': 'Saving...',
    'lbl_edit.saved': 'Saved',
    'lbl_edit.save_failed': 'Save failed',
    'lbl_edit.logo_warn': 'Logo enabled but not uploaded. Set in Settings.',
    'lbl_edit.phone_warn': 'Phone enabled but not set. Configure in Settings.',
    'lbl_edit.fields_title': 'Fields',
    'lbl_edit.auto_badge': 'auto',
    'lbl_edit.shared_badge': 'shared',
    'lbl_edit.shape_title': 'Shape',
    'lbl_edit.copies': 'Copies:',
    'lbl_edit.empty_no_label': 'No label selected',
    'lbl_edit.empty_no_label_hint': 'Select a label from the list or create a new one',
    'lbl_edit.empty_no_job': 'No job open',
    'lbl_edit.empty_no_job_hint': 'Create or open a job to start editing',
    'lbl_edit.total_length': 'Total Length:',

    // ShapeEditor
    'shape.no_shape': 'No shape',
    'shape.preset': 'Preset:',
    'shape.segments': 'Segments:',
    'shape.add_segment': '+ Add Segment',
    'shape.preset_straight': 'Straight Bar',
    'shape.preset_stirrup': 'Stirrup',
    'shape.preset_agrafa': 'Hook (Agrafa)',
    'shape.preset_bar_1': 'Bar 1 (L-Shape)',
    'shape.preset_bar_2': 'Bar 2 (U-Shape)',
    'shape.preset_bar_3': 'Bar 3 (U with return)',
    'shape.preset_custom': 'Custom',
    'shape.save_preset': 'Save as Preset',
    'shape.preset_name_ph': 'Preset name',
    'shape.delete_preset': 'Delete preset',

    // TemplateEditor DnD
    'tpl_edit.drop_new_row': 'Drop here for new row',

    // LabelList
    'lbl_list.title': 'Labels',
    'lbl_list.new': 'New',
    'lbl_list.dupe': 'Dupe',
    'lbl_list.empty': 'No labels yet',
    'lbl_list.empty_hint': 'Click "New" to create one',
    'lbl_list.no_job': 'No job open',

    // SettingsModal
    'settings.title': 'Settings',
    'settings.company': 'Company',
    'settings.company_name': 'Company Name',
    'settings.company_phone': 'Company Phone',
    'settings.branding': 'Branding',
    'settings.branding_hint': 'Templates control whether the logo appears on each label.',
    'settings.prefs': 'Preferences',
    'settings.lang': 'Language',
    'settings.print_layout': 'Print Layout',
    'settings.top': 'Top (mm)',
    'settings.bottom': 'Bottom (mm)',
    'settings.left': 'Left (mm)',
    'settings.right': 'Right (mm)',
    'settings.gap': 'Label Gap (mm)',
    'settings.save': 'Save Settings',

    // Field Input
    'field_input.custom': 'Custom',

    // XLSX
    'xlsx.subtotal': 'Subtotal',

    // Settings - Offer
    'settings.offer_format': 'Offer Format',
    'settings.offer_pdf': 'PDF (vector)',
    'settings.offer_xlsx': 'Excel (XLSX)',

    // Settings - Theme
    'settings.theme': 'Theme',
  },
  ro: {
    // MenuBar / Navigation
    'nav.jobs': 'Sesiuni',
    'nav.templates': 'Șabloane',
    'nav.settings': 'Setări',

    // TopBar
    'topbar.print': 'Exportă PDF',
    'topbar.export_offer': 'Exportă Oferta',

    // Common
    'common.save': 'Salvează',
    'common.cancel': 'Renunță',
    'common.edit': 'Modifică',
    'common.delete': 'Șterge',
    'common.duplicate': 'Duplică',
    'common.remove': 'Elimină',

    // Modals
    'modal.delete_job.title': 'Ștergere sesiune',
    'modal.delete_job.message': 'Ștergi „{name}" și toate etichetele aferente? Acțiunea e ireversibilă.',
    'modal.delete': 'Șterge',
    'modal.cancel': 'Renunță',
    'modal.delete_template.title': 'Ștergere șablon',
    'modal.delete_template.message': 'Ștergi șablonul „{name}"? Acțiunea e ireversibilă.',
    'modal.delete_label.title': 'Ștergere etichetă',
    'modal.delete_label.message': 'Ștergi eticheta „{name}"? Acțiunea e ireversibilă.',
    'modal.delete_preset.title': 'Ștergere preset',
    'modal.delete_preset.message': 'Ștergi presetul „{name}"? Acțiunea e ireversibilă.',

    // NewJobModal
    'newjob.title': 'Sesiune nouă',
    'newjob.client_label': 'Client / Șantier (opțional)',
    'newjob.template_label': 'Șablon',
    'newjob.create_btn': 'Creează',
    'newjob.empty_hint': 'Mai întâi creează un șablon cu formatul etichetelor dorit.',
    'newjob.create_template_btn': 'Creează un șablon',

    // JobManager
    'jobs.title': 'Sesiuni',
    'jobs.search_placeholder': 'Caută sesiune sau client...',
    'jobs.new_job': 'Sesiune nouă',
    'jobs.empty.title': 'Nicio sesiune',
    'jobs.empty.desc': 'Creează prima sesiune ca să începi.',
    'jobs.table.name': 'Denumire',
    'jobs.table.client': 'Client / Șantier',
    'jobs.table.labels': 'Etichete',
    'jobs.table.created': 'Creat',
    'jobs.table.modified': 'Modificat',
    'jobs.no_results': 'Niciun rezultat pentru „{search}"',

    // TemplateManager
    'templates.title': 'Șabloane',
    'templates.new_template': 'Șablon nou',
    'templates.empty.title': 'Niciun șablon',
    'templates.empty.desc': 'Creează un șablon care definește formatul etichetelor.',
    'templates.create_first': 'Creează primul șablon',
    'templates.field_count': '{count} câmpuri:',

    // TemplateEditor
    'tpl_edit.new_title': 'Șablon nou',
    'tpl_edit.edit_title': 'Editare șablon',
    'tpl_edit.name_label': 'Nume șablon',
    'tpl_edit.name_placeholder': 'ex: Etrier standard 80×50',
    'tpl_edit.page_setup': 'Pagină',
    'tpl_edit.page_size': 'Format',
    'tpl_edit.orientation': 'Orientare',
    'tpl_edit.portrait': 'Vertical',
    'tpl_edit.landscape': 'Orizontal',
    'tpl_edit.page_w': 'Lățime (mm)',
    'tpl_edit.page_h': 'Înălțime (mm)',
    'tpl_edit.label_size': 'Dimensiune etichetă',
    'tpl_edit.custom_dims': 'Dimensiuni fixe (mm)',
    'tpl_edit.columns': 'Coloane',
    'tpl_edit.rows': 'Rânduri',
    'tpl_edit.auto_size_hint': 'Etichetele se dimensionează automat în grilă de {cols}×{rows}.',
    'tpl_edit.width': 'Lățime (mm)',
    'tpl_edit.height': 'Înălțime (mm)',
    'tpl_edit.branding': 'Logo și contact',
    'tpl_edit.show_logo': 'Afișează logo pe etichete',
    'tpl_edit.no_logo_hint': 'Logo neîncărcat. Se setează din Setări.',
    'tpl_edit.show_phone': 'Afișează telefonul pe etichete',
    'tpl_edit.phone_hint': 'Telefonul se setează din Setări.',
    'tpl_edit.fields': 'Câmpuri',
    'tpl_edit.add_field': '+ Câmp nou',
    'tpl_edit.empty_fields': 'Adaugă câmpuri: Marcă, Diametru, Lungime etc.',
    'tpl_edit.field_name_ph': 'Nume (ex. Marcă)',
    'tpl_edit.field_default_ph': 'Valoare implicită',
    'tpl_edit.field_unnamed': '(câmp fără nume)',
    'tpl_edit.field_name_label': 'Nume câmp',
    'tpl_edit.field_type_label': 'Tip',
    'tpl_edit.type_text': 'Text',
    'tpl_edit.type_number': 'Număr',
    'tpl_edit.default_label': 'Valoare implicită',
    'tpl_edit.font_size_label': 'Dimensiune font',
    'tpl_edit.font_small': 'Mic',
    'tpl_edit.font_medium': 'Med',
    'tpl_edit.font_large': 'Mare',
    'tpl_edit.bold_label': 'Îngroșat',
    'tpl_edit.layout_label': 'Aspect',
    'tpl_edit.layout_full': 'Întreagă',
    'tpl_edit.layout_half': 'Jumătate',
    'tpl_edit.split_row': 'Separă pe rând propriu',
    'tpl_edit.pair_placeholder': 'Trage un câmp aici',
    'tpl_edit.scope_label': 'Domeniu',
    'tpl_edit.scope_per_label': 'Per etichetă',
    'tpl_edit.scope_shared': 'Comun',
    'tpl_edit.source_label': 'Sursă',
    'tpl_edit.source_manual': 'Manual',
    'tpl_edit.source_total_length': 'Lungime totală',
    'tpl_edit.source_client_name': 'Nume client',
    'tpl_edit.source_diameter': 'Diametru (Ø)',
    'tpl_edit.source_buc': 'Bucăți (Buc.)',
    'tpl_edit.drag_hint': 'Trage pentru reordonare',
    'tpl_edit.preview_title': 'Previzualizare',
    'tpl_edit.print_layout_heading': 'Margini pagină',
    'tpl_edit.print_layout': 'Margini personalizate',
    'tpl_edit.margin_top': 'Margine sus (mm)',
    'tpl_edit.margin_bottom': 'Margine jos (mm)',
    'tpl_edit.margin_left': 'Margine stânga (mm)',
    'tpl_edit.margin_right': 'Margine dreapta (mm)',
    'tpl_edit.label_gap': 'Spațiu între etichete (mm)',
    'tpl_edit.printer_margin': 'Margine imprimantă (mm)',
    'tpl_edit.printer_margin_hint': 'Zona neimprimabilă. Implicit 4.5mm.',
    'tpl_edit.field_padding': 'Padding câmpuri (mm)',
    'tpl_edit.field_padding_hint': 'Distanța de la marginea etichetei la text. Implicit 6mm.',
    'tpl_edit.length_unit': 'Unitate lungime',
    'tpl_edit.unit_mm': 'Milimetri (mm)',
    'tpl_edit.unit_cm': 'Centimetri (cm)',

    // LabelEditor
    'lbl_edit.saving': 'Se salvează...',
    'lbl_edit.saved': 'Salvat',
    'lbl_edit.save_failed': 'Eroare la salvare',
    'lbl_edit.logo_warn': 'Logo activat dar neîncărcat. Setează din Setări.',
    'lbl_edit.phone_warn': 'Telefon activat dar necompletat. Setează din Setări.',
    'lbl_edit.fields_title': 'Date armătură',
    'lbl_edit.auto_badge': 'auto',
    'lbl_edit.shared_badge': 'comun',
    'lbl_edit.shape_title': 'Formă',
    'lbl_edit.copies': 'Bucăți:',
    'lbl_edit.empty_no_label': 'Nicio etichetă selectată',
    'lbl_edit.empty_no_label_hint': 'Selectează din listă sau creează una nouă.',
    'lbl_edit.empty_no_job': 'Nicio sesiune deschisă',
    'lbl_edit.empty_no_job_hint': 'Deschide sau creează o sesiune.',
    'lbl_edit.total_length': 'Lungime totală:',

    // ShapeEditor
    'shape.no_shape': 'Fără formă',
    'shape.preset': 'Formă:',
    'shape.segments': 'Segmente:',
    'shape.add_segment': '+ Segment',
    'shape.preset_straight': 'Bară dreaptă',
    'shape.preset_stirrup': 'Etrier',
    'shape.preset_agrafa': 'Agrafă',
    'shape.preset_bar_1': 'Bara 1 (L)',
    'shape.preset_bar_2': 'Bara 2 (U)',
    'shape.preset_bar_3': 'Bara 3 (U cu retur)',
    'shape.preset_custom': 'Personalizat',
    'shape.save_preset': 'Salvează ca formă',
    'shape.preset_name_ph': 'Nume formă',
    'shape.delete_preset': 'Șterge forma',

    // TemplateEditor DnD
    'tpl_edit.drop_new_row': 'Trage aici pentru rând nou',

    // LabelList
    'lbl_list.title': 'Etichete',
    'lbl_list.new': 'Nou',
    'lbl_list.dupe': 'Duplică',
    'lbl_list.empty': 'Nicio etichetă',
    'lbl_list.empty_hint': 'Apasă „Nou" pentru a adăuga.',
    'lbl_list.no_job': 'Nicio sesiune deschisă',

    // SettingsModal
    'settings.title': 'Setări',
    'settings.company': 'Companie',
    'settings.company_name': 'Nume companie',
    'settings.company_phone': 'Telefon',
    'settings.branding': 'Logo',
    'settings.branding_hint': 'Logo-ul se activează din fiecare șablon.',
    'settings.prefs': 'Preferințe',
    'settings.lang': 'Limbă',
    'settings.print_layout': 'Margini pagină',
    'settings.top': 'Sus (mm)',
    'settings.bottom': 'Jos (mm)',
    'settings.left': 'Stânga (mm)',
    'settings.right': 'Dreapta (mm)',
    'settings.gap': 'Spațiu între etichete (mm)',
    'settings.save': 'Salvează',

    // Field Input
    'field_input.custom': 'Personalizat',

    // XLSX
    'xlsx.subtotal': 'Subtotal',

    // Settings - Offer
    'settings.offer_format': 'Format ofertă',
    'settings.offer_pdf': 'PDF (vector)',
    'settings.offer_xlsx': 'Excel (XLSX)',

    // Settings - Theme
    'settings.theme': 'Temă',
  }
};

export const _ = derived(settings, ($settings) => {
  const lang = $settings.language || 'en';
  const dict = translations[lang] || translations['en'];
  
  return (key: string, vars?: Record<string, string | number>) => {
    let text = dict[key] || translations['en'][key] || key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.replace(new RegExp(`{${k}}`, 'g'), String(v));
      }
    }
    return text;
  };
});

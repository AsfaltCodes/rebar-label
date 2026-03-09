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
    'tpl_edit.preview_title': 'Label Preview',

    // LabelEditor
    'lbl_edit.saving': 'Saving...',
    'lbl_edit.saved': 'Saved',
    'lbl_edit.save_failed': 'Save failed',
    'lbl_edit.logo_warn': 'Logo enabled but not uploaded — set in Settings.',
    'lbl_edit.phone_warn': 'Phone enabled but not set — configure in Settings.',
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
  },
  ro: {
    // MenuBar / Navigation
    'nav.jobs': 'Sesiuni',
    'nav.templates': 'Șabloane',
    'nav.settings': 'Setări',

    // TopBar
    'topbar.print': 'Exportă PDF',

    // Common
    'common.save': 'Salvează',
    'common.cancel': 'Anulează',
    'common.edit': 'Editează',
    'common.delete': 'Șterge',
    'common.duplicate': 'Duplică',
    'common.remove': 'Elimină',

    // Modals
    'modal.delete_job.title': 'Șterge Sesiunea',
    'modal.delete_job.message': 'Sigur dorești să ștergi sesiunea "{name}" și toate etichetele sale?',
    'modal.delete': 'Șterge',
    'modal.cancel': 'Anulează',
    'modal.delete_template.title': 'Șterge Șablonul',
    'modal.delete_template.message': 'Sigur dorești să ștergi șablonul "{name}"?',
    'modal.delete_label.title': 'Șterge Eticheta',
    'modal.delete_label.message': 'Sigur dorești să ștergi eticheta "{name}"?',

    // NewJobModal
    'newjob.title': 'Sesiune Nouă',
    'newjob.client_label': 'Nume Client / Șantier (opțional)',
    'newjob.template_label': 'Șablon Etichete',
    'newjob.create_btn': 'Creează Sesiune',
    'newjob.empty_hint': 'Trebuie să creezi mai întâi un șablon pentru a defini formatul etichetelor.',
    'newjob.create_template_btn': 'Creează un Șablon',

    // JobManager
    'jobs.title': 'Sesiuni',
    'jobs.search_placeholder': 'Caută o sesiune sau șantier...',
    'jobs.new_job': 'Sesiune Nouă',
    'jobs.empty.title': 'Nicio sesiune deschisă',
    'jobs.empty.desc': 'Creează o sesiune nouă pentru a începe să generezi etichete.',
    'jobs.table.name': 'Nume Sesiune',
    'jobs.table.client': 'Șantier / Client',
    'jobs.table.labels': 'Nr. Etichete',
    'jobs.table.created': 'Data Creării',
    'jobs.table.modified': 'Ultima Modificare',
    'jobs.no_results': 'Nu a fost găsită nicio sesiune pentru "{search}"',

    // TemplateManager
    'templates.title': 'Șabloane',
    'templates.new_template': 'Șablon Nou',
    'templates.empty.title': 'Niciun șablon creat',
    'templates.empty.desc': 'Configurează un șablon pentru a defini formatul, dimensiunile și datele etichetei.',
    'templates.create_first': 'Creează Primul Șablon',
    'templates.field_count': '{count} câmpuri:',

    // TemplateEditor
    'tpl_edit.new_title': 'Creare Șablon',
    'tpl_edit.edit_title': 'Editare Șablon',
    'tpl_edit.name_label': 'Nume Șablon',
    'tpl_edit.name_placeholder': 'ex: Etichetă Standard Etrier 80x50',
    'tpl_edit.page_setup': 'Format Pagină Export',
    'tpl_edit.page_size': 'Dimensiune Coală',
    'tpl_edit.orientation': 'Orientare',
    'tpl_edit.portrait': 'Portret (Vertical)',
    'tpl_edit.landscape': 'Peisaj (Orizontal)',
    'tpl_edit.page_w': 'Lățime Coală (mm)',
    'tpl_edit.page_h': 'Înălțime Coală (mm)',
    'tpl_edit.label_size': 'Dimensiuni Etichetă',
    'tpl_edit.custom_dims': 'Dimensiuni fixe (mm)',
    'tpl_edit.columns': 'Coloane / pagină',
    'tpl_edit.rows': 'Rânduri / pagină',
    'tpl_edit.auto_size_hint': 'Etichetele se vor dimensiona automat pentru a umple pagina într-o grilă de {cols} coloane și {rows} rânduri.',
    'tpl_edit.width': 'Lățime Etichetă (mm)',
    'tpl_edit.height': 'Înălțime Etichetă (mm)',
    'tpl_edit.branding': 'Logo și Date Contact',
    'tpl_edit.show_logo': 'Imprimă logo-ul pe etichete',
    'tpl_edit.no_logo_hint': 'Logo-ul nu a fost configurat.',
    'tpl_edit.show_phone': 'Imprimă numărul de telefon',
    'tpl_edit.phone_hint': 'Numărul de telefon se configurează în meniul Setări.',
    'tpl_edit.fields': 'Câmpuri Date',
    'tpl_edit.add_field': '+ Adaugă Câmp',
    'tpl_edit.empty_fields': 'Apasă butonul de mai sus pentru a adăuga câmpuri (ex: Marcă, Diametru, Pas).',
    'tpl_edit.field_name_ph': 'Nume câmp (ex. Marcă)',
    'tpl_edit.field_default_ph': 'Valoare predefinită',
    'tpl_edit.preview_title': 'Previzualizare Print',

    // LabelEditor
    'lbl_edit.saving': 'Se salvează...',
    'lbl_edit.saved': 'Salvat',
    'lbl_edit.save_failed': 'Eroare la salvare',
    'lbl_edit.logo_warn': 'Logo-ul este activat pentru acest șablon, dar lipsește din Setări.',
    'lbl_edit.phone_warn': 'Telefonul este activat, dar nu a fost completat în Setări.',
    'lbl_edit.fields_title': 'Detalii Armătură',
    'lbl_edit.auto_badge': 'calculat',
    'lbl_edit.shared_badge': 'comun',
    'lbl_edit.shape_title': 'Formă',
    'lbl_edit.copies': 'Număr Bucăți (Buc.):',
    'lbl_edit.empty_no_label': 'Nicio etichetă selectată',
    'lbl_edit.empty_no_label_hint': 'Alege o etichetă din listă sau creează una nouă.',
    'lbl_edit.empty_no_job': 'Nicio sesiune deschisă',
    'lbl_edit.empty_no_job_hint': 'Deschide o sesiune din meniul principal pentru a continua.',
    'lbl_edit.total_length': 'Lungime Totală (Calculată):',

    // ShapeEditor
    'shape.no_shape': 'Bară Dreaptă / Fără Formă',
    'shape.preset': 'Formă:',
    'shape.segments': 'Segmente și Unghiuri:',
    'shape.add_segment': '+ Adaugă Segment',
    'shape.preset_straight': 'Bară Dreaptă',
    'shape.preset_stirrup': 'Etrier',
    'shape.preset_agrafa': 'Agrafă',
    'shape.preset_bar_1': 'Bara 1',
    'shape.preset_bar_2': 'Bara 2',
    'shape.preset_bar_3': 'Bara 3',
    'shape.preset_custom': 'Personalizat',

    // LabelList
    'lbl_list.title': 'Etichete',
    'lbl_list.new': 'Adaugă',
    'lbl_list.dupe': 'Duplică',
    'lbl_list.empty': 'Lista este goală',
    'lbl_list.empty_hint': 'Apasă "Adaugă" pentru a crea.',
    'lbl_list.no_job': 'Nicio sesiune deschisă',

    // SettingsModal
    'settings.title': 'Setări Aplicație',
    'settings.company': 'Date Companie',
    'settings.company_name': 'Numele Companiei',
    'settings.company_phone': 'Telefon Contact',
    'settings.branding': 'Logo Companie',
    'settings.branding_hint': 'Afișarea logo-ului se activează individual pentru fiecare șablon.',
    'settings.prefs': 'Preferințe Generale',
    'settings.lang': 'Limba Interfeței',
    'settings.print_layout': 'Margini de Imprimare Globale',
    'settings.top': 'Margine Sus (mm)',
    'settings.bottom': 'Margine Jos (mm)',
    'settings.left': 'Margine Stânga (mm)',
    'settings.right': 'Margine Dreapta (mm)',
    'settings.gap': 'Distanță între Etichete (mm)',
    'settings.save': 'Salvează Setările',
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

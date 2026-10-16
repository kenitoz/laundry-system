// The dashboard's customer lists form a loop, as in the web carousel.
export const TAB_CYCLE = ['all', 'unpaid', 'paid'];
export const DOT_ORDER = ['paid', 'all', 'unpaid'];
export const TAB_LABELS = { all: "Today's All Customers", paid: 'Paid Customers', unpaid: 'Unpaid Customers' };

export const stepTab = (tab, dir) => TAB_CYCLE[(TAB_CYCLE.indexOf(tab) + dir + TAB_CYCLE.length) % TAB_CYCLE.length];

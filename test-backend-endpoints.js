/**
 * Backend API Endpoints Test Script
 * 
 * This script tests all the new advanced feature endpoints
 * Run with: node test-backend-endpoints.js
 */

const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.API_URL || 'http://localhost:5001';
let authToken = '';
let companyId = '';
let userId = '';

// Test data storage
const testData = {
    expense_category_id: null,
    expense_id: null,
    vendor_id: null,
    purchase_order_id: null,
    location_id: null,
    inventory_item_id: null,
    budget_id: null,
    project_id: null,
    time_entry_id: null,
    recurring_invoice_id: null,
    notification_id: null
};

// Helper function to make authenticated requests
async function apiCall(method, endpoint, data = null, headers = {}) {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
                ...headers
            }
        };

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        return { success: true, data: response.data, status: response.status };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data || error.message,
            status: error.response?.status || 500
        };
    }
}

// Test results
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

function logTest(name, passed, message = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${name}${message ? `: ${message}` : ''}`);
    results.tests.push({ name, passed, message });
    if (passed) results.passed++;
    else results.failed++;
}

// =====================================================
// AUTHENTICATION
// =====================================================
async function testAuthentication() {
    console.log('\n🔐 Testing Authentication...\n');

    // Login
    const loginResult = await apiCall('POST', '/api/auth/login', {
        email: process.env.TEST_EMAIL || 'admin@example.com',
        password: process.env.TEST_PASSWORD || 'password123'
    });

    if (loginResult.success && loginResult.data.token) {
        authToken = loginResult.data.token;
        companyId = loginResult.data.user?.company_id || loginResult.data.company_id;
        userId = loginResult.data.user?.id || loginResult.data.user_id;
        logTest('Login', true, 'Token obtained');
        return true;
    } else {
        logTest('Login', false, loginResult.error?.error || 'Failed to login');
        return false;
    }
}

// =====================================================
// EXPENSE TRACKING
// =====================================================
async function testExpenses() {
    console.log('\n💰 Testing Expense Tracking...\n');

    // Create expense category
    const categoryResult = await apiCall('POST', '/api/expenses/categories', {
        name: 'Office Supplies',
        description: 'Office and stationery items',
        color: '#3b82f6'
    });
    logTest('Create Expense Category', categoryResult.success);
    if (categoryResult.success) {
        testData.expense_category_id = categoryResult.data.id;
    }

    // Get categories
    const categoriesResult = await apiCall('GET', '/api/expenses/categories');
    logTest('Get Expense Categories', categoriesResult.success);

    // Create expense
    const expenseResult = await apiCall('POST', '/api/expenses', {
        category_id: testData.expense_category_id,
        description: 'Test Office Supplies',
        amount: 150.50,
        expense_date: new Date().toISOString().split('T')[0],
        payment_method: 'bank_transfer',
        is_billable: false
    });
    logTest('Create Expense', expenseResult.success);
    if (expenseResult.success) {
        testData.expense_id = expenseResult.data.id;
    }

    // Get expenses
    const expensesResult = await apiCall('GET', '/api/expenses');
    logTest('Get Expenses', expensesResult.success);

    // Get expense summary
    const summaryResult = await apiCall('GET', '/api/expenses/analytics/summary');
    logTest('Get Expense Summary', summaryResult.success);
}

// =====================================================
// VENDOR MANAGEMENT
// =====================================================
async function testVendors() {
    console.log('\n🏢 Testing Vendor Management...\n');

    // Create vendor
    const vendorResult = await apiCall('POST', '/api/vendors', {
        name: 'Test Supplier Inc',
        email: 'contact@testsupplier.com',
        phone: '+1234567890',
        payment_terms: 30,
        payment_method: 'bank_transfer'
    });
    logTest('Create Vendor', vendorResult.success);
    if (vendorResult.success) {
        testData.vendor_id = vendorResult.data.id;
    }

    // Get vendors
    const vendorsResult = await apiCall('GET', '/api/vendors');
    logTest('Get Vendors', vendorsResult.success);

    // Get single vendor
    if (testData.vendor_id) {
        const vendorResult = await apiCall('GET', `/api/vendors/${testData.vendor_id}`);
        logTest('Get Single Vendor', vendorResult.success);
    }
}

// =====================================================
// PURCHASE ORDERS
// =====================================================
async function testPurchaseOrders() {
    console.log('\n📦 Testing Purchase Orders...\n');

    if (!testData.vendor_id) {
        logTest('Create Purchase Order', false, 'Vendor ID required');
        return;
    }

    // Create purchase order
    const poResult = await apiCall('POST', '/api/purchase-orders', {
        vendor_id: testData.vendor_id,
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        subtotal: 1000.00,
        tax_amount: 150.00,
        total: 1150.00,
        items: [
            {
                description: 'Test Item 1',
                quantity: 10,
                unit_price: 100.00,
                total: 1000.00
            }
        ]
    });
    logTest('Create Purchase Order', poResult.success);
    if (poResult.success) {
        testData.purchase_order_id = poResult.data.id;
    }

    // Get purchase orders
    const posResult = await apiCall('GET', '/api/purchase-orders');
    logTest('Get Purchase Orders', posResult.success);
}

// =====================================================
// INVENTORY MANAGEMENT
// =====================================================
async function testInventory() {
    console.log('\n📊 Testing Inventory Management...\n');

    // Create location
    const locationResult = await apiCall('POST', '/api/inventory/locations', {
        name: 'Main Warehouse',
        code: 'WH-001',
        type: 'warehouse',
        address: '123 Storage St'
    });
    logTest('Create Inventory Location', locationResult.success);
    if (locationResult.success) {
        testData.location_id = locationResult.data.id;
    }

    // Get locations
    const locationsResult = await apiCall('GET', '/api/inventory/locations');
    logTest('Get Inventory Locations', locationsResult.success);

    // Get low stock alerts
    const alertsResult = await apiCall('GET', '/api/inventory/alerts/low-stock');
    logTest('Get Low Stock Alerts', alertsResult.success);
}

// =====================================================
// BUDGET MANAGEMENT
// =====================================================
async function testBudgets() {
    console.log('\n📈 Testing Budget Management...\n');

    const currentYear = new Date().getFullYear();
    const startDate = `${currentYear}-01-01`;
    const endDate = `${currentYear}-12-31`;

    // Create budget
    const budgetResult = await apiCall('POST', '/api/budgets', {
        name: `Budget ${currentYear}`,
        fiscal_year: currentYear,
        start_date: startDate,
        end_date: endDate,
        status: 'draft',
        items: [
            {
                amount: 50000,
                period: 'annual'
            }
        ]
    });
    logTest('Create Budget', budgetResult.success);
    if (budgetResult.success) {
        testData.budget_id = budgetResult.data.id;
    }

    // Get budgets
    const budgetsResult = await apiCall('GET', '/api/budgets');
    logTest('Get Budgets', budgetsResult.success);
}

// =====================================================
// PROJECTS & TIME TRACKING
// =====================================================
async function testProjects() {
    console.log('\n⏱️ Testing Projects & Time Tracking...\n');

    // Create project
    const projectResult = await apiCall('POST', '/api/projects', {
        name: 'Test Project',
        description: 'A test project',
        billing_type: 'hourly',
        hourly_rate: 75.00,
        status: 'active'
    });
    logTest('Create Project', projectResult.success);
    if (projectResult.success) {
        testData.project_id = projectResult.data.id;
    }

    // Create time entry
    if (testData.project_id) {
        const timeResult = await apiCall('POST', `/api/projects/${testData.project_id}/time-entries`, {
            task_name: 'Development',
            description: 'Working on features',
            start_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            end_time: new Date().toISOString(),
            duration: 120,
            is_billable: true,
            hourly_rate: 75.00
        });
        logTest('Create Time Entry', timeResult.success);
        if (timeResult.success && timeResult.data) {
            testData.time_entry_id = timeResult.data.id;
        }
    }

    // Get projects
    const projectsResult = await apiCall('GET', '/api/projects');
    logTest('Get Projects', projectsResult.success);
}

// =====================================================
// RECURRING INVOICES
// =====================================================
async function testRecurringInvoices() {
    console.log('\n🔄 Testing Recurring Invoices...\n');

    // Get customers first (assuming we have one)
    const customersResult = await apiCall('GET', '/api/customers');
    if (customersResult.success && customersResult.data.customers?.length > 0) {
        const customerId = customersResult.data.customers[0].id;

        // Create recurring invoice
        const riResult = await apiCall('POST', '/api/recurring-invoices', {
            customer_id: customerId,
            template_name: 'Monthly Service',
            frequency: 'monthly',
            interval: 1,
            start_date: new Date().toISOString().split('T')[0],
            payment_terms: 30,
            items: [
                {
                    description: 'Monthly Service Fee',
                    quantity: 1,
                    unit_price: 500.00
                }
            ]
        });
        logTest('Create Recurring Invoice', riResult.success);
        if (riResult.success) {
            testData.recurring_invoice_id = riResult.data.id;
        }

        // Get recurring invoices
        const risResult = await apiCall('GET', '/api/recurring-invoices');
        logTest('Get Recurring Invoices', risResult.success);
    } else {
        logTest('Create Recurring Invoice', false, 'No customers found');
    }
}

// =====================================================
// NOTIFICATIONS
// =====================================================
async function testNotifications() {
    console.log('\n🔔 Testing Notifications...\n');

    // Get notifications
    const notificationsResult = await apiCall('GET', '/api/notifications');
    logTest('Get Notifications', notificationsResult.success);
    if (notificationsResult.success && notificationsResult.data.notifications?.length > 0) {
        testData.notification_id = notificationsResult.data.notifications[0].id;
    }

    // Get notification settings
    const settingsResult = await apiCall('GET', '/api/notifications/settings');
    logTest('Get Notification Settings', settingsResult.success);
}

// =====================================================
// SUBSCRIPTIONS (System Admin Only)
// =====================================================
async function testSubscriptions() {
    console.log('\n💳 Testing Subscriptions (System Admin)...\n');

    // Get subscription plans
    const plansResult = await apiCall('GET', '/api/subscriptions/plans');
    logTest('Get Subscription Plans', plansResult.success);

    // Get my subscription
    const mySubResult = await apiCall('GET', '/api/subscriptions/my-subscription');
    logTest('Get My Subscription', mySubResult.success || mySubResult.status === 404);
}

// =====================================================
// MAIN TEST RUNNER
// =====================================================
async function runTests() {
    console.log('🚀 Starting Backend API Endpoint Tests\n');
    console.log(`Base URL: ${BASE_URL}\n`);
    console.log('='.repeat(60));

    // Test authentication first
    const authSuccess = await testAuthentication();
    if (!authSuccess) {
        console.log('\n❌ Authentication failed. Cannot continue tests.');
        console.log('\nPlease set TEST_EMAIL and TEST_PASSWORD in your .env file');
        return;
    }

    // Run all tests
    await testExpenses();
    await testVendors();
    await testPurchaseOrders();
    await testInventory();
    await testBudgets();
    await testProjects();
    await testRecurringInvoices();
    await testNotifications();
    await testSubscriptions();

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 TEST SUMMARY\n');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📈 Total:  ${results.passed + results.failed}`);
    console.log(`\nSuccess Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

    if (results.failed > 0) {
        console.log('\n❌ Failed Tests:');
        results.tests
            .filter(t => !t.passed)
            .forEach(t => console.log(`   - ${t.name}: ${t.message}`));
    }

    console.log('\n✨ Tests completed!\n');
}

// Run tests
runTests().catch(error => {
    console.error('❌ Test runner error:', error);
    process.exit(1);
});


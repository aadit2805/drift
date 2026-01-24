import { Router } from 'express'
import { NessieService } from '../services/nessieService.js'

const router = Router()
const nessieService = new NessieService()

// Get all accounts
router.get('/accounts', async (req, res) => {
  try {
    const accounts = await nessieService.getAccounts()
    res.json(accounts)
  } catch (error) {
    console.error('Error fetching accounts:', error)
    res.status(500).json({ error: 'Failed to fetch accounts' })
  }
})

// Get account by ID
router.get('/accounts/:id', async (req, res) => {
  try {
    const account = await nessieService.getAccount(req.params.id)
    res.json(account)
  } catch (error) {
    console.error('Error fetching account:', error)
    res.status(500).json({ error: 'Failed to fetch account' })
  }
})

// Get account purchases
router.get('/accounts/:id/purchases', async (req, res) => {
  try {
    const purchases = await nessieService.getAccountPurchases(req.params.id)
    res.json(purchases)
  } catch (error) {
    console.error('Error fetching purchases:', error)
    res.status(500).json({ error: 'Failed to fetch purchases' })
  }
})

// Get account deposits
router.get('/accounts/:id/deposits', async (req, res) => {
  try {
    const deposits = await nessieService.getAccountDeposits(req.params.id)
    res.json(deposits)
  } catch (error) {
    console.error('Error fetching deposits:', error)
    res.status(500).json({ error: 'Failed to fetch deposits' })
  }
})

// Get account bills
router.get('/accounts/:id/bills', async (req, res) => {
  try {
    const bills = await nessieService.getAccountBills(req.params.id)
    res.json(bills)
  } catch (error) {
    console.error('Error fetching bills:', error)
    res.status(500).json({ error: 'Failed to fetch bills' })
  }
})

// Get account loans
router.get('/accounts/:id/loans', async (req, res) => {
  try {
    const loans = await nessieService.getAccountLoans(req.params.id)
    res.json(loans)
  } catch (error) {
    console.error('Error fetching loans:', error)
    res.status(500).json({ error: 'Failed to fetch loans' })
  }
})

// Get account transfers
router.get('/accounts/:id/transfers', async (req, res) => {
  try {
    const transfers = await nessieService.getAccountTransfers(req.params.id)
    res.json(transfers)
  } catch (error) {
    console.error('Error fetching transfers:', error)
    res.status(500).json({ error: 'Failed to fetch transfers' })
  }
})

// Get account withdrawals
router.get('/accounts/:id/withdrawals', async (req, res) => {
  try {
    const withdrawals = await nessieService.getAccountWithdrawals(req.params.id)
    res.json(withdrawals)
  } catch (error) {
    console.error('Error fetching withdrawals:', error)
    res.status(500).json({ error: 'Failed to fetch withdrawals' })
  }
})

// Get all merchants
router.get('/merchants', async (req, res) => {
  try {
    const merchants = await nessieService.getMerchants()
    res.json(merchants)
  } catch (error) {
    console.error('Error fetching merchants:', error)
    res.status(500).json({ error: 'Failed to fetch merchants' })
  }
})

// Get merchant by ID
router.get('/merchants/:id', async (req, res) => {
  try {
    const merchant = await nessieService.getMerchant(req.params.id)
    res.json(merchant)
  } catch (error) {
    console.error('Error fetching merchant:', error)
    res.status(500).json({ error: 'Failed to fetch merchant' })
  }
})

// Get all customers
router.get('/customers', async (req, res) => {
  try {
    const customers = await nessieService.getCustomers()
    res.json(customers)
  } catch (error) {
    console.error('Error fetching customers:', error)
    res.status(500).json({ error: 'Failed to fetch customers' })
  }
})

// Get customer by ID
router.get('/customers/:id', async (req, res) => {
  try {
    const customer = await nessieService.getCustomer(req.params.id)
    res.json(customer)
  } catch (error) {
    console.error('Error fetching customer:', error)
    res.status(500).json({ error: 'Failed to fetch customer' })
  }
})

// Get customer accounts
router.get('/customers/:id/accounts', async (req, res) => {
  try {
    const accounts = await nessieService.getCustomerAccounts(req.params.id)
    res.json(accounts)
  } catch (error) {
    console.error('Error fetching customer accounts:', error)
    res.status(500).json({ error: 'Failed to fetch customer accounts' })
  }
})

export default router

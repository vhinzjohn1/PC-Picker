import { supabase, type Part, type PCSetup, type SetupPart } from './supabase'

// Local types for localStorage fallback
type LocalPart = {
  id: string
  user_id?: string
  component?: string
  name?: string
  amount?: number
  created_at?: string
  updated_at?: string
  sort_order?: number
}

type LocalUser = {
  id: string
  username?: string
  password?: string
  currency?: string
  parts?: LocalPart[]
}

// Database operations for PC parts
export class DatabaseService {
  private userId: string | null = null
  private useLocalFallback = false

  constructor() {
    // Get current user ID from Supabase auth
    this.getCurrentUserId()

    // Listen for auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        this.userId = session.user.id
        this.useLocalFallback = false
      } else {
        this.userId = null
      }
    })
  }

  private async getCurrentUserId() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    this.userId = user?.id || null
  }

  // Ensure user is authenticated
  async ensureUser(): Promise<string> {
    if (this.userId) return this.userId as string

    // try to refresh supabase user
    try {
      await this.getCurrentUserId()
    } catch {
      // ignore
    }

    if (this.userId) return this.userId as string

    // Fallback: check localStorage 'user' (used by local auth)
    try {
      const stored = localStorage.getItem('user')
      if (stored) {
        const u = JSON.parse(stored)
        if (u?.id) {
          this.userId = u.id
          this.useLocalFallback = true
          return this.userId as string
        }
      }
    } catch {
      // ignore
    }

    throw new Error('User not authenticated')
  }

  // LocalStorage helpers for fallback mode

  private getLocalUsers(): LocalUser[] {
    try {
      return JSON.parse(localStorage.getItem('users') || '[]') as LocalUser[]
    } catch {
      return []
    }
  }

  private saveLocalUsers(users: LocalUser[]) {
    localStorage.setItem('users', JSON.stringify(users))
  }

  private getLocalUserById(id: string) {
    const users = this.getLocalUsers()
    return users.find((u) => u.id === id) || null
  }

  // Create user profile (simplified)
  private async createUserProfile(userId: string, username: string) {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: userId,
          username,
          currency: 'PHP',
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating user profile:', error)
      }
    } catch (err) {
      console.error('Error in createUserProfile:', err)
    }
  }

  // Get all parts for current user
  async getParts(): Promise<Part[]> {
    await this.ensureUser()

    if (this.useLocalFallback) {
      const local = this.getLocalUserById(this.userId!)
      if (!local) return []
      return (local.parts || []).map((p, idx) => ({
        id: p.id || `${this.userId}-${idx}`,
        user_id: this.userId!,
        component: p.component || 'component',
        name: p.name || '',
        amount: Number(p.amount) || 0,
        created_at: p.created_at || new Date().toISOString(),
        updated_at: p.updated_at || new Date().toISOString(),
        sort_order: typeof p.sort_order === 'number' ? p.sort_order : idx,
      }))
    }

    try {
      const { data, error } = await supabase
        .from('parts')
        .select('*')
        .eq('user_id', this.userId)
        .order('sort_order', { ascending: true })

      if (error) {
        console.error('Error fetching parts:', error)
        return []
      }

      return data || []
    } catch (err) {
      console.error('Error in getParts:', err)
      return []
    }
  }

  // Add or update a part (now can set sort_order)
  async savePart(
    component: string,
    name: string,
    amount: number,
    sort_order?: number,
  ): Promise<Part | null> {
    await this.ensureUser()

    if (this.useLocalFallback) {
      const users = this.getLocalUsers()
      const idx = users.findIndex((u) => u.id === this.userId)
      if (idx === -1) return null
      const user = users[idx] as LocalUser
      user.parts = user.parts || []
      const existing = user.parts.find((p) => p.component === component)
      if (existing) {
        existing.name = name
        existing.amount = amount
        if (sort_order !== undefined) existing.sort_order = sort_order
        existing.updated_at = new Date().toISOString()
      } else {
        const newPart = {
          id: Math.random().toString(36).slice(2),
          user_id: this.userId!,
          component,
          name,
          amount,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sort_order: sort_order ?? user.parts.length,
        }
        user.parts.push(newPart)
      }
      users[idx] = user
      this.saveLocalUsers(users)
      const saved = user.parts.find((p) => p.component === component)
      return saved as unknown as Part
    }

    try {
      const { data: existingPart } = await supabase
        .from('parts')
        .select('*')
        .eq('user_id', this.userId)
        .eq('component', component)
        .single()

      if (existingPart) {
        const { data, error } = await supabase
          .from('parts')
          .update({
            name,
            amount,
            updated_at: new Date().toISOString(),
            ...(sort_order !== undefined ? { sort_order } : {}),
          })
          .eq('id', existingPart.id)
          .select()
          .single()

        if (error) {
          console.error('Error updating part:', error)
          return null
        }

        return data
      } else {
        const { data, error } = await supabase
          .from('parts')
          .insert({
            user_id: this.userId!,
            component,
            name,
            amount,
            ...(sort_order !== undefined ? { sort_order } : {}),
          })
          .select()
          .single()

        if (error) {
          console.error('Error creating part:', error)
          return null
        }

        return data
      }
    } catch (err) {
      console.error('Error in savePart:', err)
      return null
    }
  }

  // Batch update sort_order for parts
  async updatePartOrders(
    parts: {
      id: string
      user_id: string
      component: string
      name: string
      amount: number
      sort_order: number
    }[],
  ): Promise<boolean> {
    await this.ensureUser()
    const updates = parts.map((part) => ({
      id: part.id,
      user_id: part.user_id,
      component: part.component,
      name: part.name,
      amount: part.amount,
      sort_order: part.sort_order,
    }))
    try {
      const { error, status } = await supabase.from('parts').upsert(updates, { onConflict: 'id' })
      if (error) {
        console.error('[updatePartOrders] Update failed', {
          userId: this.userId,
          updates,
          status,
          supabaseError: error,
        })
        return false
      }
      return true
    } catch (err) {
      console.error('[updatePartOrders] Threw exception:', {
        userId: this.userId,
        updates,
        errorObj: err,
      })
      return false
    }
  }

  // Delete a part
  async deletePart(partId: string): Promise<boolean> {
    await this.ensureUser()

    if (this.useLocalFallback) {
      try {
        const users = this.getLocalUsers()
        const idx = users.findIndex((u) => u.id === this.userId)
        if (idx === -1) return false
        const localUser = users[idx] as LocalUser
        localUser.parts = (localUser.parts || []).filter((p) => p.id !== partId)
        users[idx] = localUser
        this.saveLocalUsers(users)
        return true
      } catch (e) {
        console.error('Error deleting part (local):', e)
        return false
      }
    }

    try {
      const { error } = await supabase
        .from('parts')
        .delete()
        .eq('id', partId)
        .eq('user_id', this.userId)

      if (error) {
        console.error('Error deleting part:', error)
        return false
      }

      return true
    } catch (err) {
      console.error('Error in deletePart:', err)
      return false
    }
  }

  // Update user currency
  async updateCurrency(currency: string): Promise<boolean> {
    await this.ensureUser()

    if (this.useLocalFallback) {
      try {
        const users = this.getLocalUsers()
        const idx = users.findIndex((u) => u.id === this.userId)
        if (idx === -1) return false
        const localUser = users[idx] as LocalUser
        localUser.currency = currency
        users[idx] = localUser
        this.saveLocalUsers(users)
        return true
      } catch (e) {
        console.error('Error updating currency (local):', e)
        return false
      }
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: this.userId,
          username: 'Anonymous User',
          currency,
        })
        .eq('id', this.userId)

      if (error) {
        console.error('Error updating currency:', error)
        return false
      }

      return true
    } catch (err) {
      console.error('Error in updateCurrency:', err)
      return false
    }
  }

  // Get user currency
  async getCurrency(): Promise<string> {
    await this.ensureUser()

    if (this.useLocalFallback) {
      const local = this.getLocalUserById(this.userId!)
      return local?.currency || 'PHP'
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('currency')
        .eq('id', this.userId)
        .maybeSingle()

      if (error) {
        console.error('Error fetching currency:', error)
        return 'PHP'
      }

      // If no profile exists, create one with default currency
      if (!data) {
        await this.createUserProfile(this.userId!, 'Anonymous User')
        return 'PHP'
      }

      return data.currency || 'PHP'
    } catch (err) {
      console.error('Error in getCurrency:', err)
      return 'PHP'
    }
  }

  // Seed default parts for new users
  async seedDefaultParts(): Promise<void> {
    await this.ensureUser()

    try {
      const defaultComponents = [
        'CPU',
        'GPU',
        'Motherboard',
        'RAM',
        'Storage',
        'Power Supply',
        'Case',
        'CPU Cooler',
      ]

      for (const component of defaultComponents) {
        await this.savePart(component, '', 0)
      }
    } catch (err) {
      console.error('Error in seedDefaultParts:', err)
    }
  }

  // PC Setups methods
  async getSetups(): Promise<PCSetup[]> {
    await this.ensureUser()

    try {
      const { data, error } = await supabase
        .from('pc_setups')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching setups:', error)
        return []
      }

      return data || []
    } catch (err) {
      console.error('Error in getSetups:', err)
      return []
    }
  }

  async createSetup(
    name: string,
    description: string,
    parts: Array<{ component: string; name: string; amount: number }>,
  ): Promise<PCSetup | null> {
    await this.ensureUser()

    try {
      // Ensure user profile exists
      await this.getCurrency()

      // Calculate total amount
      const totalAmount = parts.reduce((sum, part) => sum + part.amount, 0)

      // Create the setup
      const { data: setup, error: setupError } = await supabase
        .from('pc_setups')
        .insert({
          user_id: this.userId!,
          name,
          description,
          total_amount: totalAmount,
        })
        .select()
        .single()

      if (setupError) {
        console.error('Error creating setup:', setupError)
        return null
      }

      // Add parts to the setup
      const setupParts = parts.map((part) => ({
        setup_id: setup.id,
        component: part.component,
        name: part.name,
        amount: part.amount,
      }))

      const { error: partsError } = await supabase.from('setup_parts').insert(setupParts)

      if (partsError) {
        console.error('Error adding parts to setup:', partsError)
        // Clean up the setup if parts insertion failed
        await supabase.from('pc_setups').delete().eq('id', setup.id)
        return null
      }

      return setup
    } catch (err) {
      console.error('Error in createSetup:', err)
      return null
    }
  }

  async getSetupParts(setupId: string): Promise<SetupPart[]> {
    await this.ensureUser()

    try {
      const { data, error } = await supabase
        .from('setup_parts')
        .select('*')
        .eq('setup_id', setupId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching setup parts:', error)
        return []
      }

      return data || []
    } catch (err) {
      console.error('Error in getSetupParts:', err)
      return []
    }
  }

  async loadSetupToCurrentParts(setupId: string): Promise<boolean> {
    await this.ensureUser()

    try {
      // Get setup parts
      const setupParts = await this.getSetupParts(setupId)

      if (setupParts.length === 0) {
        return false
      }

      // Clear current parts
      await supabase.from('parts').delete().eq('user_id', this.userId)

      // Add setup parts to current parts
      const currentParts = setupParts.map((part) => ({
        user_id: this.userId!,
        component: part.component,
        name: part.name,
        amount: part.amount,
      }))

      const { error } = await supabase.from('parts').insert(currentParts)

      if (error) {
        console.error('Error loading setup to current parts:', error)
        return false
      }

      return true
    } catch (err) {
      console.error('Error in loadSetupToCurrentParts:', err)
      return false
    }
  }

  async deleteSetup(setupId: string): Promise<boolean> {
    await this.ensureUser()

    try {
      // Delete setup parts first (due to foreign key constraint)
      const { error: partsError } = await supabase
        .from('setup_parts')
        .delete()
        .eq('setup_id', setupId)

      if (partsError) {
        console.error('Error deleting setup parts:', partsError)
        return false
      }

      // Delete the setup
      const { error: setupError } = await supabase
        .from('pc_setups')
        .delete()
        .eq('id', setupId)
        .eq('user_id', this.userId)

      if (setupError) {
        console.error('Error deleting setup:', setupError)
        return false
      }

      return true
    } catch (err) {
      console.error('Error in deleteSetup:', err)
      return false
    }
  }

  async updateSetup(
    setupId: string,
    name: string,
    description: string,
    parts: Array<{ component: string; name: string; amount: number }>,
  ): Promise<boolean> {
    await this.ensureUser()

    try {
      // Calculate total amount
      const totalAmount = parts.reduce((sum, part) => sum + part.amount, 0)

      // Update the setup
      const { error: setupError } = await supabase
        .from('pc_setups')
        .update({
          name,
          description,
          total_amount: totalAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', setupId)
        .eq('user_id', this.userId)

      if (setupError) {
        console.error('Error updating setup:', setupError)
        return false
      }

      // Delete existing parts
      const { error: deleteError } = await supabase
        .from('setup_parts')
        .delete()
        .eq('setup_id', setupId)

      if (deleteError) {
        console.error('Error deleting existing setup parts:', deleteError)
        return false
      }

      // Add new parts
      const setupParts = parts.map((part) => ({
        setup_id: setupId,
        component: part.component,
        name: part.name,
        amount: part.amount,
      }))

      const { error: partsError } = await supabase.from('setup_parts').insert(setupParts)

      if (partsError) {
        console.error('Error adding new setup parts:', partsError)
        return false
      }

      return true
    } catch (err) {
      console.error('Error in updateSetup:', err)
      return false
    }
  }
}

// Export singleton instance
export const db = new DatabaseService()

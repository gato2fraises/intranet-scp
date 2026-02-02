// Discord webhook notifications

export function generateTemporaryPassword(): string {
  // Générer un mot de passe temporaire lisible (8 caractères)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let password = ''
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export async function sendDiscordNotification(embed: any): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL

  if (!webhookUrl) {
    console.log('Discord webhook not configured')
    return
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    })

    if (!response.ok) {
      console.error('Discord webhook error:', response.statusText)
    }
  } catch (error) {
    console.error('Error sending Discord notification:', error)
  }
}

export function createUserCreationEmbed(username: string, password: string, role: string, department: string): any {
  return {
    title: '👤 Nouvel Utilisateur Créé',
    description: `Un nouvel utilisateur a été créé dans l'intranet SCPRP`,
    color: 3447003, // Bleu
    fields: [
      {
        name: 'Utilisateur',
        value: `\`${username}\``,
        inline: true
      },
      {
        name: 'Rôle',
        value: `\`${role}\``,
        inline: true
      },
      {
        name: 'Département',
        value: `\`${department}\``,
        inline: false
      },
      {
        name: '🔑 Mot de passe temporaire',
        value: `\`\`\`${password}\`\`\``,
        inline: false
      },
      {
        name: '⚠️ Important',
        value: 'Envoyer le mot de passe à la personne concernée et demander de le changer à la première connexion',
        inline: false
      }
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'SCPRP Intranet - Gestion des utilisateurs'
    }
  }
}

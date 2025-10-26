const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// Send order confirmation to customer
const sendOrderConfirmation = async (order) => {
  try {
    // Handle both data structures
    const customerEmail = order.customerEmail || order.customer?.email;
    const customerName = order.customerName || order.customer?.name;
    const customerPhone = order.customerPhone || order.customer?.phone;
    const totalAmount = order.totalAmount || order.total;

    if (!customerEmail) {
      console.error('No customer email found in order');
      return false;
    }

    const itemsList = order.items.map(item => 
      `${item.quantity}x ${item.name} - $${(item.price * item.quantity).toFixed(2)}`
    ).join('\n');

    const emailData = {
      from: 'Defiant Meals <onboarding@resend.dev>',
      to: [customerEmail],
      subject: `Order Confirmation #${order._id.toString().slice(-8)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb; text-align: center;">Order Confirmed!</h1>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2>Order #${order._id.toString().slice(-8)}</h2>
            <p><strong>Customer:</strong> ${customerName}</p>
            <p><strong>Email:</strong> ${customerEmail}</p>
            <p><strong>Phone:</strong> ${customerPhone}</p>
            <p><strong>Pickup Date:</strong> ${new Date(order.pickupDate).toLocaleDateString()}</p>
            <p><strong>Pickup Time:</strong> ${order.pickupTime}</p>
          </div>

          <div style="background: #fff; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px;">
            <h3>Your Items:</h3>
            <pre style="font-family: monospace; background: #f1f5f9; padding: 15px; border-radius: 4px;">${itemsList}</pre>
            <hr style="margin: 20px 0;">
            <p style="text-align: right; font-size: 18px;"><strong>Total: $${totalAmount.toFixed(2)}</strong></p>
          </div>

          ${order.customerNotes ? `
            <div style="margin: 20px 0;">
              <h3>Special Instructions:</h3>
              <p style="background: #fef3c7; padding: 15px; border-radius: 4px;">${order.customerNotes}</p>
            </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0; padding: 20px; background: #ecfdf5; border-radius: 8px;">
            <h3 style="color: #059669;">Thank You for Your Order!</h3>
            <p>We'll have your fresh meals ready for pickup at the scheduled time.</p>
            <p style="margin-top: 15px; color: #6b7280;">Questions? Reply to this email or call us at 913-585-5126</p>
          </div>
        </div>
      `
    };

    console.log('Attempting to send customer email to:', customerEmail);
    const { data, error } = await resend.emails.send(emailData);
    
    if (error) {
      console.error('Error sending customer email:', error);
      return false;
    }
    
    console.log('Order confirmation sent to customer:', customerEmail, 'Email ID:', data.id);
    return true;
  } catch (error) {
    console.error('Error in sendOrderConfirmation:', error);
    return false;
  }
};

// Send new order notification to admin
const sendAdminNotification = async (order) => {
  try {
    // Handle both data structures
    const customerEmail = order.customerEmail || order.customer?.email;
    const customerName = order.customerName || order.customer?.name;
    const customerPhone = order.customerPhone || order.customer?.phone;
    const totalAmount = order.totalAmount || order.total;

    const itemsList = order.items.map(item => 
      `${item.quantity}x ${item.name} - $${(item.price * item.quantity).toFixed(2)}`
    ).join('\n');

    const emailData = {
      from: 'Defiant Meals <onboarding@resend.dev>',
      to: ['defiantmealsmenu@gmail.com'], 
      subject: `🔔 New Order #${order._id.toString().slice(-8)} - $${totalAmount.toFixed(2)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #dc2626; text-align: center;">🔔 New Order Received!</h1>
          
          <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0;">
            <h2>Order #${order._id.toString().slice(-8)}</h2>
            <p><strong>Customer:</strong> ${customerName}</p>
            <p><strong>Email:</strong> ${customerEmail}</p>
            <p><strong>Phone:</strong> ${customerPhone}</p>
            <p><strong>Pickup Date:</strong> ${new Date(order.pickupDate).toLocaleDateString()}</p>
            <p><strong>Pickup Time:</strong> ${order.pickupTime}</p>
            <p><strong>Payment:</strong> ${order.paymentMethod || 'Card'}</p>
          </div>

          <div style="background: #fff; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px;">
            <h3>Order Items:</h3>
            <pre style="font-family: monospace; background: #f1f5f9; padding: 15px; border-radius: 4px;">${itemsList}</pre>
            <hr style="margin: 20px 0;">
            <p style="text-align: right; font-size: 20px; color: #059669;"><strong>Total: $${totalAmount.toFixed(2)}</strong></p>
          </div>

          ${order.customerNotes ? `
            <div style="margin: 20px 0;">
              <h3>Customer Notes:</h3>
              <p style="background: #fef3c7; padding: 15px; border-radius: 4px; border-left: 4px solid #f59e0b;">${order.customerNotes}</p>
            </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0; padding: 20px; background: #eff6ff; border-radius: 8px;">
            <p style="font-size: 16px;">Check your admin dashboard to manage this order.</p>
            <a href="https://defiantmeals.com/admin" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 10px;">View Dashboard</a>
          </div>
        </div>
      `
    };

    const { data, error } = await resend.emails.send(emailData);
    
    if (error) {
      console.error('Error sending admin notification:', error);
      return false;
    }
    
    console.log('Admin notification sent:', data.id);
    return true;
  } catch (error) {
    console.error('Error in sendAdminNotification:', error);
    return false;
  }
};

module.exports = {
  sendOrderConfirmation,
  sendAdminNotification
};
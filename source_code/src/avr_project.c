 /* CDDL HEADER START
 *
 * The contents of this file are subject to the terms of the
 * Common Development and Distribution License (the "License").
 * You may not use this file except in compliance with the License.
 *
 * You can obtain a copy of the license at src/license_cddl-1.0.txt
 * or http://www.opensolaris.org/os/licensing.
 * See the License for the specific language governing permissions
 * and limitations under the License.
 *
 * When distributing Covered Code, include this CDDL HEADER in each
 * file and include the License file at src/license_cddl-1.0.txt
 * If applicable, add the following below this CDDL HEADER, with the
 * fields enclosed by brackets "[]" replaced with your own identifying
 * information: Portions Copyright [yyyy] [name of copyright owner]
 *
 * CDDL HEADER END
 */
/*
 * avr_project.c
 *
 * Created: 08/12/2013 13:54:34
 *  Author: Mathieu Stephan
 */
#include "mooltipass.h"
#include <util/delay.h>
#include <avr/io.h>


/*!	\fn 	disable_jtag(void)
*	\brief	Disable the JTAG module
*/
void disable_jtag(void)
{
	unsigned char temp;

	temp = MCUCR;
	temp |= (1<<JTD);
	MCUCR = temp;
	MCUCR = temp;
}

/*!	\fn 	main(void)
*	\brief	Main function
*/
int main(void)
{
	RET_TYPE flash_init_result = RETURN_NOK;
	RET_TYPE card_detection_result;
	RET_TYPE card_detect_ret;
	RET_TYPE temp_rettype;
	uint8_t temp_buffer[200];
	char temp_string[20];
	
	/* Set for 16 MHz clock */
	CPU_PRESCALE(0);
	
	/* Let the power settle */
	_delay_ms(500);
	
	/* Initialize smart card port */
	init_smartcard_port();
	
	/* Initialize interrupts */
	init_interrupts();

	/* Initialize the USB, and then wait for the host to set configuration */
	usb_init();
	while(!usb_configured());
	
	/* Initialize OLED screen */
	init_oled_screen();
	
	/* Initialize flash */
	flash_init_result = init_flash_memory();
	
	//lcd_display_grayscale();
	if(flash_init_result == RETURN_OK)
		Show_String("Flash init ok", FALSE, 2, 0);
	else
		Show_String("Problem flash init", FALSE, 2, 250);
	//display_picture(HACKADAY_BMP, 20, 0);
	//draw_screen_frame();
	//Show_String("Mooltipass", FALSE, 32, 10);
	//display_1bit_picture(PWR_BY_COSW, 0, 0, 256, 64);

    while(1)
    {
		// See if the card has been plugged
		card_detect_ret = is_card_plugged();
        if(card_detect_ret == RETURN_JDETECT)
		{
			// Check the card detection result
			card_detection_result = smartcard_detection_functions();
			
			if(card_detection_result == RETURN_CARD_NDET)
			{
				// This is not a card....
				Show_String("Not a card", FALSE, 2, 8);
				smartcard_removal_functions();
			}
			else if(card_detection_result == RETURN_CARD_TEST_PB)
			{
				// Card test problem...
				Show_String("Card test problem", FALSE, 2, 8);
				smartcard_removal_functions();
			}
			else if(card_detection_result == RETURN_CARD_0_TRIES_LEFT)
			{
				// Card blocked
				Show_String("Card blocked", FALSE, 2, 8);
				smartcard_removal_functions();
			}
			else
			{
				/** Card detected and valid **/
				// Detect if the card is blank by checking that the manufacturer zone is different from FFFF
				if(swap16(*(uint16_t*)read_manufacturers_zone(temp_buffer)) == 0xFFFF)
				{
					// Non init card, let's transform it into a mooltipass card ! **/
					Show_String("Blank card, transforming...", FALSE, 2, 8);
					
					// Try to authenticate with factory pin
					temp_rettype = security_code_validation(SMARTCARD_FACTORY_PIN);
					
					if(temp_rettype == RETURN_PIN_OK)
					{
						if(perform_card_mooltipass_transformation() == RETURN_OK)
						{
							Show_String("Card transformed !", FALSE, 2, 16);
							_delay_ms(2000);print_smartcard_debug_info();
						}
						else
						{
							Show_String("Couldn't transform card !", FALSE, 2, 16);
							_delay_ms(2000);print_smartcard_debug_info();
						}
					}
					else
					{
						int_to_string(get_number_of_security_code_tries_left(), temp_string);
						Show_String(temp_string, FALSE, 2, 16);
						Show_String("tries left, wrong pin", FALSE, 6, 16);
					}
				}
				else
				{
					// Already init
					/** Mooltipass card detected **/
					Show_String("Mooltipass card detected", FALSE, 2, 8);
					
					// Try to unlock it
					temp_rettype = security_code_validation(SMARTCARD_FACTORY_PIN);
					
					if(temp_rettype == RETURN_PIN_OK)
					{
						// Check that the card is in security mode 2 by reading the SC
						if(swap16(*(uint16_t*)read_security_code(temp_buffer)) != 0xFFFF)
						{
							// Card in security mode 1, transform it again
							Show_String("Transforming...", FALSE, 2, 16);
							perform_card_mooltipass_transformation();
							_delay_ms(4000);print_smartcard_debug_info();
						}
						else
						{
							// Everything is ok
							Show_String("PIN code checked !", FALSE, 2, 16);
							temp_buffer[0] = 0x80;
							temp_buffer[1] = 0x00;
							erase_application_zone1_nzone2(FALSE);
							write_to_smartcard(736, 16, temp_buffer);
							erase_application_zone1_nzone2(TRUE);
							write_to_smartcard(176, 16, temp_buffer);
							_delay_ms(2000);print_smartcard_debug_info();							
						}						
					}
					else
					{
						int_to_string(get_number_of_security_code_tries_left(), temp_string);
						Show_String(temp_string, FALSE, 2, 16);
						Show_String("tries left, wrong pin", FALSE, 6, 16);
						_delay_ms(2000);print_smartcard_debug_info();
					}
				}
			}
			//print_smartcard_debug_info();
			/*read_credential_block_within_flash_page(2,1,temp_buffer);
			for(i = 0; i < 10; i++)
			{
				hexachar_to_string(temp_buffer[i], temp_string);
				Show_String(temp_string, FALSE, 2+i*5, 0);
			}
			temp_buffer[3] = 0x0A;
			write_credential_block_within_flash_page(2,1, temp_buffer);
			read_credential_block_within_flash_page(2,1,temp_buffer);
			for(i = 0; i < 10; i++)
			{
				hexachar_to_string(temp_buffer[i], temp_string);
				Show_String(temp_string, FALSE, 2+i*5, 8);
			}*/
		}
		else if(card_detect_ret == RETURN_JRELEASED)
		{
			smartcard_removal_functions();
			clear_screen();
		}
    }
}
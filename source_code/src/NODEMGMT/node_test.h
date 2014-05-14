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

/* Copyright (c) 2014, Michael Neiderhauser. All rights reserved. */

/*!  \file     flash_test.h
*    \brief    Mooltipass Node Test Functions Header
*    Created:  2/5/2014
*    Author:   Michael Neiderhauser
*/

#ifndef NODE_TEST_H_
#define NODE_TEST_H_

#include "defines.h"
#include "node_mgmt.h"
#include <stdint.h>

/*!
*  Parent Node Test Error Codes ENUM
*/
typedef enum
{
    PARENT_NODE_TEST_PARENT_NODE_AOK = 0,
    PARENT_NODE_TEST_ERASE_ALL_SECTORS_ERROR,
    PARENT_NODE_TEST_INIT_HANDLE_FUNCTION_FAIL,
    PARENT_NODE_TEST_USER_PROFILE_SET_START_NULL_ERROR,
    PARENT_NODE_TEST_USER_PROFILE_CLEAR_FAV_ERROR,
    PARENT_NODE_TEST_HANDLE_UID_ERROR, // 5
    PARENT_NODE_TEST_HANDLE_FIRST_PARENT_NODE_ERROR,
    PARENT_NODE_TEST_HANDLE_FREE_PARENT_NODE_ERROR,
    PARENT_NODE_TEST_STEP_1_CREATE_NODE_ERROR,
    PARENT_NODE_TEST_STEP_1_CREATE_NODE_VERIFY_SERVICE_ERROR,
    PARENT_NODE_TEST_STEP_1_CREATE_NODE_VERIFY_NEXT_NODE_ERROR, // 10
    PARENT_NODE_TEST_STEP_1_CREATE_NODE_VERIFY_PREV_NODE_ERROR,
    PARENT_NODE_TEST_STEP_1_VERIFY_HANDLE_FIRST_NODE_ERROR,
    PARENT_NODE_TEST_STEP_1_VERIFY_HANDLE_NEXT_FREE_NODE_ERROR,
    PARENT_NODE_TEST_STEP_2_CREATE_NODE_ERROR,
    PARENT_NODE_TEST_STEP_2_CREATE_NODE_VERIFY_SERVICE_ERROR, // 15
    PARENT_NODE_TEST_STEP_2_CREATE_NODE_VERIFY_NEXT_NODE_ERROR,
    PARENT_NODE_TEST_STEP_2_CREATE_NODE_VERIFY_PREV_NODE_ERROR,
    PARENT_NODE_TEST_STEP_2_READ_NODE_C_ERROR,
    PARENT_NODE_TEST_STEP_2_VERIFY_NODE_C_SERVICE_ERROR,
    PARENT_NODE_TEST_STEP_2_VERIFY_NODE_C_NEXT_NODE_ERROR, // 20
    PARENT_NODE_TEST_STEP_2_VERIFY_NODE_C_PREV_NODE_ERROR,
    PARENT_NODE_TEST_STEP_2_VERIFY_HANDLE_FIRST_NODE_ERROR,
    PARENT_NODE_TEST_STEP_2_VERIFY_HANDLE_NEXT_FREE_NODE_ERROR,
    PARENT_NODE_TEST_STEP_3_CREATE_NODE_ERROR,
    PARENT_NODE_TEST_STEP_3_CREATE_NODE_VERIFY_SERVICE_ERROR, // 25
    PARENT_NODE_TEST_STEP_3_CREATE_NODE_VERIFY_NEXT_NODE_ERROR,
    PARENT_NODE_TEST_STEP_3_CREATE_NODE_VERIFY_PREV_NODE_ERROR,
    PARENT_NODE_TEST_STEP_3_READ_NODE_C_ERROR,
    PARENT_NODE_TEST_STEP_3_VERIFY_NODE_C_SERVICE_ERROR,
    PARENT_NODE_TEST_STEP_3_VERIFY_NODE_C_NEXT_NODE_ERROR, // 30
    PARENT_NODE_TEST_STEP_3_VERIFY_NODE_C_PREV_NODE_ERROR,
    PARENT_NODE_TEST_STEP_3_READ_NODE_M_ERROR,
    PARENT_NODE_TEST_STEP_3_VERIFY_NODE_M_SERVICE_ERROR,
    PARENT_NODE_TEST_STEP_3_VERIFY_NODE_M_NEXT_NODE_ERROR,
    PARENT_NODE_TEST_STEP_3_VERIFY_NODE_M_PREV_NODE_ERROR, // 35
    PARENT_NODE_TEST_STEP_3_VERIFY_HANDLE_FIRST_NODE_ERROR,
    PARENT_NODE_TEST_STEP_3_VERIFY_HANDLE_NEXT_FREE_NODE_ERROR,
    PARENT_NODE_TEST_STEP_4_CREATE_NODE_ERROR,
    PARENT_NODE_TEST_STEP_4_CREATE_NODE_VERIFY_SERVICE_ERROR,
    PARENT_NODE_TEST_STEP_4_CREATE_NODE_VERIFY_NEXT_NODE_ERROR, // 40
    PARENT_NODE_TEST_STEP_4_CREATE_NODE_VERIFY_PREV_NODE_ERROR,
    PARENT_NODE_TEST_STEP_4_READ_NODE_C_ERROR,
    PARENT_NODE_TEST_STEP_4_VERIFY_NODE_C_SERVICE_ERROR,
    PARENT_NODE_TEST_STEP_4_VERIFY_NODE_C_NEXT_NODE_ERROR,
    PARENT_NODE_TEST_STEP_4_VERIFY_NODE_C_PREV_NODE_ERROR, // 45
    PARENT_NODE_TEST_STEP_4_READ_NODE_K_ERROR,
    PARENT_NODE_TEST_STEP_4_VERIFY_NODE_K_SERVICE_ERROR,
    PARENT_NODE_TEST_STEP_4_VERIFY_NODE_K_NEXT_NODE_ERROR,
    PARENT_NODE_TEST_STEP_4_VERIFY_NODE_K_PREV_NODE_ERROR,
    PARENT_NODE_TEST_STEP_4_READ_NODE_M_ERROR, // 50
    PARENT_NODE_TEST_STEP_4_VERIFY_NODE_M_SERVICE_ERROR,
    PARENT_NODE_TEST_STEP_4_VERIFY_NODE_M_NEXT_NODE_ERROR,
    PARENT_NODE_TEST_STEP_4_VERIFY_NODE_M_PREV_NODE_ERROR,
    PARENT_NODE_TEST_STEP_4_VERIFY_HANDLE_FIRST_NODE_ERROR,
    PARENT_NODE_TEST_STEP_4_VERIFY_HANDLE_NEXT_FREE_NODE_ERROR, // 55
    PARENT_NODE_TEST_STEP_5_DELETE_NODE_ERROR,
    PARENT_NODE_TEST_STEP_5_READ_NODE_A_ERROR,
    PARENT_NODE_TEST_STEP_5_VERIFY_NODE_A_SERVICE_ERROR,
    PARENT_NODE_TEST_STEP_5_VERIFY_NODE_A_NEXT_NODE_ERROR,
    PARENT_NODE_TEST_STEP_5_VERIFY_NODE_A_PREV_NODE_ERROR, // 60
    PARENT_NODE_TEST_STEP_5_READ_NODE_C_ERROR,
    PARENT_NODE_TEST_STEP_5_VERIFY_NODE_C_SERVICE_ERROR,
    PARENT_NODE_TEST_STEP_5_VERIFY_NODE_C_NEXT_NODE_ERROR,
    PARENT_NODE_TEST_STEP_5_VERIFY_NODE_C_PREV_NODE_ERROR,
    PARENT_NODE_TEST_STEP_5_READ_NODE_M_ERROR, // 65
    PARENT_NODE_TEST_STEP_5_VERIFY_NODE_M_SERVICE_ERROR,
    PARENT_NODE_TEST_STEP_5_VERIFY_NODE_M_NEXT_NODE_ERROR,
    PARENT_NODE_TEST_STEP_5_VERIFY_NODE_M_PREV_NODE_ERROR,
    PARENT_NODE_TEST_STEP_5_VERIFY_HANDLE_FIRST_NODE_ERROR,
    PARENT_NODE_TEST_STEP_5_VERIFY_HANDLE_NEXT_FREE_NODE_ERROR, // 70
    PARENT_NODE_TEST_STEP_6_DELETE_NODE_ERROR,
    PARENT_NODE_TEST_STEP_6_READ_NODE_A_ERROR,
    PARENT_NODE_TEST_STEP_6_VERIFY_NODE_A_SERVICE_ERROR,
    PARENT_NODE_TEST_STEP_6_VERIFY_NODE_A_NEXT_NODE_ERROR,
    PARENT_NODE_TEST_STEP_6_VERIFY_NODE_A_PREV_NODE_ERROR, // 75
    PARENT_NODE_TEST_STEP_6_READ_NODE_C_ERROR,
    PARENT_NODE_TEST_STEP_6_VERIFY_NODE_C_SERVICE_ERROR,
    PARENT_NODE_TEST_STEP_6_VERIFY_NODE_C_NEXT_NODE_ERROR,
    PARENT_NODE_TEST_STEP_6_VERIFY_NODE_C_PREV_NODE_ERROR,
    PARENT_NODE_TEST_STEP_6_VERIFY_HANDLE_FIRST_NODE_ERROR, // 80
    PARENT_NODE_TEST_STEP_6_VERIFY_HANDLE_NEXT_FREE_NODE_ERROR,
    PARENT_NODE_TEST_STEP_7_DELETE_NODE_ERROR,
    PARENT_NODE_TEST_STEP_7_READ_NODE_C_ERROR,
    PARENT_NODE_TEST_STEP_7_VERIFY_NODE_C_SERVICE_ERROR,
    PARENT_NODE_TEST_STEP_7_VERIFY_NODE_C_NEXT_NODE_ERROR, // 85
    PARENT_NODE_TEST_STEP_7_VERIFY_NODE_C_PREV_NODE_ERROR,
    PARENT_NODE_TEST_STEP_7_VERIFY_HANDLE_FIRST_NODE_ERROR,
    PARENT_NODE_TEST_STEP_7_VERIFY_HANDLE_NEXT_FREE_NODE_ERROR,
    PARENT_NODE_TEST_STEP_8_DELETE_NODE_ERROR,
    PARENT_NODE_TEST_STEP_8_VERIFY_HANDLE_FIRST_NODE_ERROR, // 90
    PARENT_NODE_TEST_STEP_8_VERIFY_HANDLE_NEXT_FREE_NODE_ERROR,
    PARENT_NODE_TEST_STEP_9_CREATE_NODE_B_ERROR,
    PARENT_NODE_TEST_STEP_9_CREATE_NODE_A_ERROR,
    PARENT_NODE_TEST_STEP_9_VERIFY_HANDLE_FIRST_NODE_1_ERROR,
    PARENT_NODE_TEST_STEP_9_VERIFY_HANDLE_NEXT_FREE_NODE_1_ERROR, // 95
    PARENT_NODE_TEST_STEP_9_UPDATE_NODE_A_1_ERROR,
    PARENT_NODE_TEST_STEP_9_VERIFY_HANDLE_FIRST_NODE_2_ERROR,
    PARENT_NODE_TEST_STEP_9_VERIFY_HANDLE_NEXT_FREE_NODE_2_ERROR,
    PARENT_NODE_TEST_STEP_9_UPDATE_NODE_A_2_ERROR,
    PARENT_NODE_TEST_STEP_9_VERIFY_NODE_C_SERVICE_ERROR, // 100
    PARENT_NODE_TEST_STEP_9_VERIFY_NODE_C_NEXT_NODE_ERROR,
    PARENT_NODE_TEST_STEP_9_VERIFY_NODE_C_PREV_NODE_ERROR,
    PARENT_NODE_TEST_STEP_9_VERIFY_HANDLE_FIRST_NODE_3_ERROR,
    PARENT_NODE_TEST_STEP_9_VERIFY_HANDLE_NEXT_FREE_NODE_3_ERROR, //104
} parentNodeTestError;

RET_TYPE nodeTest();
RET_TYPE nodeFlagFunctionTest();
RET_TYPE nodeAddressTest();
RET_TYPE userProfileOffsetTest();
RET_TYPE nodeInitHandle();
RET_TYPE userProfileAddressTest(mgmtHandle *h);
void printParentNode(pNode *p);
RET_TYPE parentNodeTest(mgmtHandle *h, uint8_t *code);


#endif /* FLASH_TEST_H_ */
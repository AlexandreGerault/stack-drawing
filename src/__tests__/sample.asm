0000000000001129 <main>:
    1129:	55                   	push   %rbp
    112a:	48 89 e5             	mov    %rsp,%rbp
    112d:	48 83 ec 10          	sub    $0x10,%rsp
    1131:	c7 45 fc 01 00 00 00 	movl   $0x1,-0x4(%rbp)
    1138:	c7 45 f8 02 00 00 00 	movl   $0x2,-0x8(%rbp)
    113f:	48 8d 55 f8          	lea    -0x8(%rbp),%rdx
    1143:	48 8d 45 fc          	lea    -0x4(%rbp),%rax
    1147:	48 89 d6             	mov    %rdx,%rsi
    114a:	48 89 c7             	mov    %rax,%rdi
    114d:	e8 07 00 00 00       	call   1159 <swap>
    1152:	b8 00 00 00 00       	mov    $0x0,%eax
    1157:	c9                   	leave
    1158:	c3                   	ret
	
main:
	pushq	%rbp    
	movq	%rsp, %rbp
	subq	$16, %rsp
	movl	$1, -4(%rbp)
	movl	$2, -8(%rbp)
	leaq	-8(%rbp), %rdx
	leaq	-4(%rbp), %rax
	movq	%rdx, %rsi
	movq	%rax, %rdi
	call	swap
	movl	$0, %eax
	leave
	ret
	.size	main, .-main
	.globl	swap
	.type	swap, @function
